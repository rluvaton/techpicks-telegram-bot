const {Octokit} = require("@octokit/core");
const config = require('../config');
const {TECH_PICKS_REGEX} = require('../common');

const octokit = new Octokit({auth: config.github.token});

async function isGitHubBranchExists(branch) {
    try {
        await octokit.request('GET /repos/{owner}/{repo}/branches/{branch}', {
            owner: config.github.owner,
            repo: config.github.repo,
            branch
        });

        return true;
    } catch (e) {
        if (e.status === 404) {
            return false;
        }

        console.error('Failed getting branch', e);
        throw e;
    }
}

async function getSHAForBranch(branchName) {
    const branch = await octokit.request('GET /repos/{owner}/{repo}/branches/{branch}', {
        owner: config.github.owner,
        repo: config.github.repo,
        branch: branchName
    });

    return branch?.data?.commit?.sha;
}

async function createBranch(branchName, sourceSha) {
    // According to https://stackoverflow.com/a/9513594/5923666
    return await octokit.request('POST /repos/{owner}/{repo}/git/refs', {
        owner: config.github.owner,
        repo: config.github.repo,

        ref: `refs/heads/${branchName}`,
        sha: sourceSha
    })
}

async function getPathSha(path) {
    let pathDetails;
    try {
        pathDetails = await octokit.request('GET /repos/{owner}/{repo}/contents/{path}', {
            owner: config.github.owner,
            repo: config.github.repo,

            path
        });

    } catch (e) {
        if (e.status === 404) {
            return undefined;
        }

        console.error('Failed getting path sha', e);
        throw e;
    }

    return pathDetails.data.sha;

}

const addNewTechPicksToGitHub = async ({content, timestamp}) => {
    const isBranchExists = await isGitHubBranchExists(config.github.branch);
    if (!isBranchExists) {
        const mainSha = await getSHAForBranch('main');
        if(!mainSha) {
            throw new Error(`SHA for main branch can't be falsy`);
        }
        await createBranch(config.github.branch, mainSha);
    }

    let date;

    try {
        date = getDateFromContent(content);
    } catch (err) {
        console.error('Failed get the date from message content', {content, date}, err);
        console.log('Fallback to path from date');

        // The timestamp is in seconds and Date object get milliseconds timestamp so we convert it
        date = new Date(timestamp * 1000);
    }

    // The month is from 0-11 so we +1 it to get the "human" month
    const path = `${config.github.filePrefixPath || ''}${date.getFullYear()}/${date.getMonth() + 1}/${date.getDate()}.txt`;

    const pathSha = await getPathSha(path);
    await createFileAtRepo({path, message: `Adding ${path} file`, content, pathSha});

    let openPrResult;
    try {
        openPrResult = await createPrAtRepo(`Adding ${path} file`);
    } catch (e) {
        // TODO: change check against the message as messages can change more frequently than other things.
        //       And status 422 can be other things too (I think)
        if(e.status === 422 && e.message.startsWith('A pull request already exists')) {
            console.log('A PR already exists', e);
            return;
        }
        console.error('Failed to create PR', e);
    }
    const newPrNumber = openPrResult?.data?.number;

    await addLabelToPr(newPrNumber, config.github.label);
};

function getDateFromContent(content) {
    if (!content) {
        throw new Error(`'content' cant be falsy, (content=${content})`);
    }

    if (typeof content !== 'string') {
        throw new Error(`'content' must be string type`);
    }

    const results = TECH_PICKS_REGEX.exec(content);

    // Reset the regex so if we run again it'll produce the same results
    TECH_PICKS_REGEX.lastIndex = undefined;

    // 6 groups for:
    //  1. Title itself
    //  2. Whole date
    //  3. day
    //  4. Month
    //  5. Full Year
    //  6. first 2 digits (for 2021 it will be 20)
    if (results.length < 6) {
        console.error(`'content' header don't have at least 6 groups`, {results, content});
        throw new Error(`'content' header don't have at least 6 groups`);
    }

    // Skipping 2 values
    let [, , day, month, year] = results;

    day = parseInt(day, 10);
    if (isNaN(day)) {
        throw new Error(`couldn't convert the day value to integer (day=${day})`);
    }

    month = parseInt(month, 10);
    if (isNaN(month)) {
        throw new Error(`couldn't convert the month value to integer (month=${month})`);
    }

    year = parseInt(year, 10);
    if (isNaN(year)) {
        throw new Error(`couldn't convert the year value to integer (year=${year})`);
    }

    // Month is between 0-11
    return new Date(year, month - 1, day);
}

async function createFileAtRepo({path, message, content, pathSha}) {
    return await octokit.request('PUT /repos/{owner}/{repo}/contents/{path}', {
        owner: config.github.owner,
        repo: config.github.repo,

        path,
        // In case of updating
        sha: pathSha,
        message,

        // The input should be encoded in base64 as said here:
        // https://docs.github.com/en/rest/reference/repos#create-or-update-file-contents--parameters (`content` value)
        content: Buffer.from(content).toString('base64'),

        branch: config.github.branch,
    });
}

async function createPrAtRepo(title) {
    return await octokit.request('POST /repos/{owner}/{repo}/pulls', {
        owner: config.github.owner,
        repo: config.github.repo,
        head: config.github.branch,
        title,
        base: 'main'
    })
}

async function addLabelToPr(prNumber, label) {
    return await octokit.request('POST /repos/{owner}/{repo}/issues/{issue_number}/labels', {
        owner: config.github.owner,
        repo: config.github.repo,
        issue_number: prNumber,
        labels: [
            label
        ]
    })
}

module.exports = {addNewTechPicksToGitHub};
