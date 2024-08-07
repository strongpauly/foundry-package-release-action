// noinspection JSUnresolvedFunction,JSIgnoredPromiseFromCall

const core = require('@actions/core')
const github = require('@actions/github')


const actionToken = core.getInput('actionToken')
const dryRun = core.getInput('dryRun')
const foundryToken = core.getInput('foundryToken')
const manifestFileName = core.getInput('manifestFileName')
const octokit = github.getOctokit(actionToken)
const owner = github.context.payload.repository.owner.login
const repo = github.context.payload.repository.name

async function updatePackage() {
    try {

        // Download release
        const latestRelease = await octokit.rest.repos.getLatestRelease({
            owner: owner,
            repo: repo,
        })
        console.log(latestRelease.data.assets)

        // Get the Asset ID of the version file from the release info
        let assetID = 0
        for (const item of latestRelease.data.assets) {
            if (item.name === manifestFileName) {
                assetID = item.id
            }
        }
        if (assetID === 0) {
            console.log(latestRelease)
            core.setFailed('No AssetID for manifest file')
        }

        const manifestAssetUrl = `https://api.github.com/repos/${owner}/${repo}/releases/assets/${assetID}`
        console.log(manifestAssetUrl)

        const manifestAssetResponse = await fetch(manifestAssetUrl, {
            headers: {
                Authorization: `token ${actionToken}`, Accept: 'application/octet-stream'
            }
        })
        console.log(manifestAssetResponse)
        const manifestFileData = await manifestAssetResponse.json()
        console.log(manifestFileData)

        console.log("about to parse manifest file data")
        console.log(manifestFileData)
        console.log(manifestFileData.version)

        const version = manifestFileData.version

        const compatibilityMaxFromManifest = manifestFileData.compatibility?.maximum
        console.log(compatibilityMaxFromManifest)

        const compatibilityMinFromManifest = manifestFileData.compatibility?.minimum
        console.log(compatibilityMinFromManifest)

        const compatibilityVerifiedFromManifest = manifestFileData.compatibility?.verified
        console.log(compatibilityVerifiedFromManifest)

        const releaseNotesUrl = `https://github.com/${owner}/${repo}/releases/tag/${version}`
        console.log(releaseNotesUrl)

        console.log("Foundry Token")
        console.log(foundryToken)

        const foundryResponse = await fetch("https://api.foundryvtt.com/_api/packages/release_version/", {
            headers: {
                'Content-Type': 'application/json',
                'Authorization': foundryToken
            },
            method: "POST",
            body: JSON.stringify({
                "id": repo,
                "dry-run": dryRun,
                "release": {
                    "version": version,
                    "manifest": assetFileData.manifest,
                    "notes": releaseNotesUrl,
                    "compatibility": {
                        "minimum": compatibilityMinFromManifest,
                        "verified": compatibilityVerifiedFromManifest,
                        "maximum": compatibilityMaxFromManifest
                    }
                }
            })
        })
        console.log(foundryResponse)
        if (foundryResponse.status === 200) {
            const foundryResponseData = await foundryResponse.json()
            console.log(foundryResponseData)
        } else {
            core.setFailed(foundryResponse.statusText)
        }

    } catch (error) {
        core.setFailed(error.message)
    }
}

async function run() {
    try {
        // Validate manifestFileName
        if (manifestFileName !== 'system.json' && manifestFileName !== 'module.json')
            core.setFailed('manifestFileName must be system.json or module.json')

        await updatePackage()

    } catch (error) {
        core.setFailed(error.message)
    }
}

run()