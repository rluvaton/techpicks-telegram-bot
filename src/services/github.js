const {Octokit} = require("@octokit/core");
const config = require('../config');

const octokit = new Octokit({auth: config.github.token});

async function isGitHubBranchExists({owner, repo, branch}) {
    try {
        await octokit.request('GET /repos/{owner}/{repo}/branches/{branch}', {
            owner,
            repo,
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

async function getSHAForBranch({owner, repo, branch}) {
    const branchData = await octokit.request('GET /repos/{owner}/{repo}/branches/{branch}', {
        owner,
        repo,
        branch
    });

    return branchData?.data?.commit?.sha;
}

async function createBranch({owner, repo, branch, sourceSha}) {
    // According to https://stackoverflow.com/a/9513594/5923666
    return await octokit.request('POST /repos/{owner}/{repo}/git/refs', {
        owner,
        repo,
        ref: `refs/heads/${branch}`,
        sha: sourceSha
    })
}

async function getPathSha({owner, repo, path}) {
    let pathDetails;
    try {
        pathDetails = await octokit.request('GET /repos/{owner}/{repo}/contents/{path}', {
            owner,
            repo,
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

async function createFileAtRepo({owner, repo, path, message, content, pathSha, branch}) {
    return await octokit.request('PUT /repos/{owner}/{repo}/contents/{path}', {
        owner,
        repo,
        path,
        // In case of updating
        sha: pathSha,
        message,

        // The input should be encoded in base64 as said here:
        // https://docs.github.com/en/rest/reference/repos#create-or-update-file-contents--parameters (`content` value)
        content: Buffer.from(content).toString('base64'),

        branch,
    });
}

async function createPrAtRepo({owner, repo, branch, title, base}) {
    return await octokit.request('POST /repos/{owner}/{repo}/pulls', {
        owner,
        repo,
        head: branch,
        title,
        base
    })
}

async function addLabelsToPr({owner, repo, prNumber, labels}) {
    return await octokit.request('POST /repos/{owner}/{repo}/issues/{issue_number}/labels', {
        owner,
        repo,
        issue_number: prNumber,
        labels: [
            ...labels
        ]
    })
}

module.exports = {
    isGitHubBranchExists,
    getSHAForBranch,
    createBranch,
    getPathSha,
    createFileAtRepo,
    createPrAtRepo,
    addLabelsToPr,
};
