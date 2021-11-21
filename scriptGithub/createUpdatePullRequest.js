module.exports = async ({github, context}) => {
  const semver = require('semver');
  console.log('TAG_LATEST', process.env.TAG_LATEST);
  console.log('TAG_LATEST_DATE', process.env.TAG_LATEST_DATE);
  // Check if there is no changes between branch staging and main
  const repoMainData = await github.rest.repos.getBranch({
    owner: context.repo.owner,
    repo: context.repo.repo,
    branch: 'main',
  });
  const repoStagingData = await github.rest.repos.getBranch({
    owner: context.repo.owner,
    repo: context.repo.repo,
    branch: 'staging',
  });
  console.log('repoMainData', repoMainData);
  console.log('repoMainData commit', repoMainData.data.commit.commit);
  console.log('repoStagingData', repoStagingData);

  // Skip Create / Update Pull Request
  if (repoMainData.data.commit.sha === repoStagingData.data.commit.sha) {
    return {
      skipCreatePullRequest: false,
    };
  }

  // Check create / update
  // get list of merged PR to staging since last git tag
  const lastTagReleaseDate = new Date(
    process.env.TAG_LATEST_DATE,
  ).toISOString();
  console.log('lastTagReleaseDate', lastTagReleaseDate);
  const pullRequestsStagingMerged = await github.rest.issues.listForRepo({
    owner: context.actor,
    repo: context.repo.repo,
    state: 'closed',
    labels: ['QAPassed', 'dev'],
    sort: 'updated',
    since: lastTagReleaseDate,
  });
  // console.log('pullRequestsStaging', pullRequestsStaging);
  // const pullRequestsStagingMerged = pullRequestsStaging.data.filter(
  //   pullRequest => !!pullRequest.merged_at,
  //   // open when no development changing from main
  //   // && new Date(pullRequest.merged_at) > new Date(context.payload.pull_request.base.updated_at)
  // );
  console.log('pullRequestsStagingMerged', pullRequestsStagingMerged);

  if (pullRequestsStagingMerged.length === 0) {
    const nextVersion = semver(process.env.TAG_LATEST.tag, 'patch');
    // Create
    const createdPR = await github.rest.pulls.create({
      owner: context.repo.owner,
      repo: context.repo.repo,
      head: 'staging',
      base: 'main',
      title: `Release - ${nextVersion}`,
      body: `
      ## Fix:
      ## Feature:
      ## Modify:
      ## Breaking:
      `,
    });
    console.log('createdPR', createdPR);
    return createdPR;
  }

  // Update
  // Get Pull Request Release
  // get list of merged PR
  const pullRequestsReleases = await github.rest.pulls.list({
    owner: context.actor,
    repo: context.repo.repo,
    state: 'open',
    base: 'main',
    sort: 'updated',
  });
  const pullRequestsRelease = pullRequestsReleases.data[0];

  // Generate and update pull request body
  const mappedTitle = str => {
    const prefix = str.split('-')[0].trim().toLowerCase();
    return {
      prType: prefix,
      title: str,
    };
  };
  let body = '';
  const titles = pullRequestsStagingMerged.map(item => ({
    ...mappedTitle(item.title),
    url: item.url,
  }));
  console.log('titles', titles);
  const listTypes = ['fix', 'feature', 'modify', 'breaking'];
  const mappingType = {
    fix: 'patch',
    feature: 'minor',
    modify: 'minor',
    breaking: 'major',
  };
  console.log('listTypes', listTypes);
  let releaseType = mappingType.fix;
  listTypes.forEach(prType => {
    console.log('prType', prType);
    body += `\n## ${prType}`;
    const titleTypes = titles.filter(title => title.prType === prType);
    titleTypes.forEach(titleType => {
      releaseType = mappingType[titleType];
      body += `\n - ${titleType.title} [url](${titleType.url})`;
    });
  });
  const finalVersion = semver.inc(process.env.TAG_LATEST.tag, releaseType);
  console.log('body', body);
  await github.rest.pulls.update({
    owner: context.actor,
    repo: context.repo.repo,
    pull_number: pullRequestsRelease.number,
    title: `Release - ${finalVersion}`,
    body,
  });

  return {
    skipCreatePullRequest: true,
  };
};
