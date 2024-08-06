// noinspection JSUnresolvedFunction,JSIgnoredPromiseFromCall

const core = require('@actions/core')
const github = require('@actions/github')


const actionToken = core.getInput('actionToken')
const compatibilityMin = core.getInput('compatibilityMin')
const compatibilityMax = core.getInput('compatibilityMax')
const compatibilityVerified = core.getInput('compatibilityVerified')
const dryRun = core.getInput('dryRun')
const foundryToken = core.getInput('foundryToken')
const manifestFileName = core.getInput('manifestFileName')
const octokit = github.getOctokit(actionToken)
const owner = github.context.payload.repository.owner.login
const repo = github.context.payload.repository.name

async function updatePackage () {
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

    const manifestAssetResponse = await fetch(manifestAssetUrl)
    console.log(manifestAssetResponse)
    const assetFileData = await manifestAssetResponse.json()
    console.log(assetFileData)
    const manifestFileResponse = await fetch(assetFileData.browser_download_url)
    const manifestFileData = await manifestFileResponse.json()
    console.log("MANIFEST FILE DATA")
    console.log(manifestFileData)
    console.log(manifestFileData.version)

    const version = manifestFileData.version

    const compatibilityMinFromManifest = manifestFileData.compatibility?.minumum || '12'
    console.log(compatibilityMinFromManifest)

    const releaseNotesUrl = `https://github.com/${owner}/${repo}/releases/tag/${version}`
    console.log(releaseNotesUrl)

    const response = await fetch("https://api.foundryvtt.com/_api/packages/release_version/", {
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
          "manifest": assetFileData.browser_download_url,
          "notes": releaseNotesUrl,
          "compatibility": {
            "minimum": compatibilityMin,
            "verified": compatibilityVerified,
            "maximum": compatibilityMax
          }
        }
      })
    })
    console.log(response_data)
    const response_data = await response.json()

  } catch (error) {
    core.setFailed(error.message)
  }
}

async function run () {
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