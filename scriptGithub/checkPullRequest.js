module.exports = async ({github, context}) => {
  // Check if there is no changes between branch staging and main
  // const repoMainData = await github.rest.repos.getBranch({
  //   owner: context.repo.owner,
  //   repo: context.repo.repo,
  //   branch: 'main',
  // });
  // const repoStagingData = await github.rest.repos.getBranch({
  //   owner: context.repo.owner,
  //   repo: context.repo.repo,
  //   branch: 'staging',
  // });
  // console.log('repoMainData', repoMainData);
  // console.log('repoMainData commit', repoMainData.data.commit.commit);
  // console.log('repoStagingData', repoStagingData);

  // // Skip Create / Update Pull Request
  // if (repoMainData.data.commit.sha === repoStagingData.data.commit.sha) {
  //   return {
  //     skipCreatePullRequest: false,
  //   };
  // }

  // Get Pull Request Release
  const pullRequestsReleases = await github.rest.pulls.list({
    owner: context.actor,
    repo: context.repo.repo,
    state: 'open',
    base: 'main',
    sort: 'updated',
  });

  let output = {};
  if (pullRequestsReleases.data.length === 0) {
    output = {
      processType: 'create',
    };
  } else {
    output = {
      processType: 'update',
      prNumber: pullRequestsReleases.data[0].number,
    };
  }
  console.log('output', output);
  return output;
};
