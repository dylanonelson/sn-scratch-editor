To deploy the Standard Notes extension:

1. check out a new branch in the format release-x.x.x
1. run `npm version <major | minor | patch>` so the committed version matches the branch name
1. update the fields in ext.json to point to the new version
1. run `npm run build`
1. push to GitHub and merge the branch
1. create a new release and tag matching the x.x.x version number from above
1. pull master and  run scripts/deploy.sh