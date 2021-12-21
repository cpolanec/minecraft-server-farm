# How to Contribute

This project is essentially a declaration of one implementation of a Minecraft server farm (running on AWS EC2 virtual machines). Contributors to this project must consider this caveat since changes to this repository would have the effect of updating that one implementation.

## How to report issues

Issues with the templates or scripts should be reported through the [GitHub Issue tracker](https://github.com/cpolanec/minecraft-server-farm/issues).

## How to make changes

Contributions should be proposed through pull requests from forked repositories:

1. [Fork the repository](https://docs.github.com/en/get-started/quickstart/fork-a-repo)
1. Install the dependencies: `npm install`
1. Create a feature branch: `git checkout -b my-proposed-feature`
1. Make your changes and validate them:

        $ npm run build
        $ npm run lint
        $ npm run test

1. Commit your changes and push to remote branch:

        $ git commit -am "add my feature"
        $ git push origin my-proposed-feature

1. [Create a pull request](https://docs.github.com/en/pull-requests/collaborating-with-pull-requests/proposing-changes-to-your-work-with-pull-requests/creating-a-pull-request) back to `main` branch in original repo
