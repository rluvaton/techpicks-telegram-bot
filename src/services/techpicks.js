const config = require('../config');
const {TECH_PICKS_REGEX} = require('../common');
const {
    getSHAForBranch,
    isBranchExists,
    createBranch,
    getPathSha,
    createPr,
    createFile,
    addLabelsToPrOrIssue
} = require('./github');

const getRepoConf = () => ({
    repo: config.github.repo,
    owner: config.github.owner,
});

async function ensureGitHubBranchExists() {
    const repoConf = getRepoConf();

    const isBranchExistsRes = await isBranchExists({...repoConf, branch: config.github.branch});
    if (isBranchExistsRes) {
        return;
    }

    const mainSha = await getSHAForBranch({...repoConf, branch: 'main'});
    if (!mainSha) {
        throw new Error(`SHA for main branch can't be falsy`);
    }

    await createBranch({...repoConf, branch: config.github.branch, sourceSha: mainSha});
}

async function createNewTechPicksFile(path, content) {
    const repoConf = getRepoConf();

    const pathSha = await getPathSha({...repoConf, path});

    await createFile({
        ...repoConf,
        branch: config.github.branch,
        path,
        message: `Adding ${path} file`,
        content,
        pathSha
    });
}

function getTechPicksFilePath(content, timestamp) {
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
    return path;
}

async function createNewTechPicksPr() {
    const repoConf = getRepoConf();

    let openPrResult;
    try {
        openPrResult = await createPr({
            ...repoConf,
            branch: config.github.branch,
            title: `Adding ${path} file`,
            base: 'main'
        });
    } catch (e) {
        // TODO: change check against the message as messages can change more frequently than other things.
        //       And status 422 can be other things too (I think)
        if (e.status === 422 && e.message.startsWith('A pull request already exists')) {
            console.log('A PR already exists', e);
            return -1;
        }
        console.error('Failed to create PR', e)
        throw e;
    }

    return openPrResult?.data?.number;
}

const addNewTechPicksToGitHub = async ({content, timestamp}) => {
    const repoConf = getRepoConf();

    await ensureGitHubBranchExists();

    const path = getTechPicksFilePath(content, timestamp);
    await createNewTechPicksFile(path, content);

    const prNumber = await createNewTechPicksPr();

    // Meaning that the PR already exist
    // Therefore there is no need to add labels to an already exists Pr (which already have label probably)
    if (prNumber === -1) {
        return;
    }

    await addLabelsToPrOrIssue({...repoConf, prOrIssueNumber: prNumber, labels: [config.github.label]});
};

function getDateFromContent(content) {
    if (!content) {
        throw new Error(`'content' cant be falsy, (content=${content})`);
    }

    if (typeof content !== 'string') {
        throw new Error(`'content' must be string type`);
    }

    const results = TECH_PICKS_REGEX.exec(content);

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


module.exports = {
    addNewTechPicksToGitHub
};
