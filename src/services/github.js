const {Octokit} = require("@octokit/core");
const config = require('../config');
const axios = require('axios');
const gitHashObject = require('git-hash-object');

const octokit = new Octokit({auth: config.github.token});

async function isBranchExists({owner, repo, branch}) {
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

async function getPathShaFromGithub({owner, repo, path}) {
    const pathDetails = await octokit.request('GET /repos/{owner}/{repo}/contents/{path}', {
        owner,
        repo,
        path
    });

    return pathDetails.data.sha;
}

async function getPathShaManually({owner, repo, path, branch}) {
    const requestUrl = `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/${path}`

    let fileContentRes;
    try {
        fileContentRes = await axios.get(requestUrl);
    } catch (e) {
        if (!e.isAxiosError) {
            throw e;
        }

        // If file don't exist it will return 404
        e.status = e.response.status;
        throw e;
    }
    const fileContent = fileContentRes.data;

    if (!fileContent) {
        const error = new Error('file dont exist');
        error.status = 404;
        throw error;
    }

    return gitHashObject(fileContent)
}

async function getPathSha({owner, repo, path, branch}) {
    let pathSha;
    try {
        // GitHub only support getting the path detail from the default branch
        if (!branch) {
            pathSha = await getPathShaFromGithub({owner, repo, path})
        } else {
            pathSha = await getPathShaManually({owner, repo, path, branch});
        }

    } catch (e) {
        if (e.status === 404) {
            return undefined;
        }

        console.error('Failed getting path sha', {owner, repo, path, branch}, e);
        throw e;
    }

    return pathSha;

}

async function createFile({owner, repo, path, message, content, pathSha, branch}) {
    const options = {
        owner,
        repo,
        path,
        message,

        // In case of updating
        sha: pathSha,

        // The input should be encoded in base64 as said here:
        // https://docs.github.com/en/rest/reference/repos#create-or-update-file-contents--parameters (`content` value)
        content: Buffer.from(content).toString('base64'),

        branch,
    };

    return await octokit.request('PUT /repos/{owner}/{repo}/contents/{path}', options);
}

async function createPr({owner, repo, branch, title, base}) {
    return await octokit.request('POST /repos/{owner}/{repo}/pulls', {
        owner,
        repo,
        head: branch,
        title,
        base
    })
}

async function addLabelsToPrOrIssue({owner, repo, prOrIssueNumber, labels}) {
    return await octokit.request('POST /repos/{owner}/{repo}/issues/{issue_number}/labels', {
        owner,
        repo,
        issue_number: prOrIssueNumber,
        labels: [
            ...labels
        ]
    })
}

async function createGist(files, description = '', isPrivate = true) {
    const formattedFiles = Object.entries(files).reduce((_formattedFiles, [fileName, fileContent]) => {
        _formattedFiles[fileName] = {content: fileContent};
        return _formattedFiles;
    }, {});

    const response = await octokit.request('POST /gists', {
        files: formattedFiles,
        description,
        public: !isPrivate
    });

    return response.data;

}

module.exports = {
    isBranchExists,
    getSHAForBranch,
    createBranch,
    getPathSha,
    createFile,
    createPr,
    addLabelsToPrOrIssue,
    createGist,
};
