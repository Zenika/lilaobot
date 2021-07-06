<h1 align="center">Welcome to lilaobot 👋</h1>
<p>
  <a href="TODO add documentation URL" target="_blank">
    <img alt="Documentation" src="https://img.shields.io/badge/documentation-yes-brightgreen.svg" />
  </a>
  <a href="https://twitter.com/lhauspie" target="_blank">
    <img alt="Twitter: lhauspie" src="https://img.shields.io/twitter/follow/lhauspie.svg?style=social" />
  </a>
</p>

> lilaobot allows call for offers from various sources (currently OBMS and Little Big Connection are envisionned) to be gathered from sources and to be published into Slack channel

Work in progress :construction:

## Setup
### How
On each commit, Github Actions applies Terraform conf (located at `./terraform`),
to deploy the GCP Function (located at `./functions`)

Terraform state is saved in a Google Cloud Storage named `lilaobot-terraform-state`

### Requirements
- a GCS bucket to store Terraform's state
- a GCP Service Account, with `Cloud Function Developer`, `Service Account User`, `Storage Object Admin` and `Storage Admin` roles
- Secrets on Github repository:
    - GCP_SA_KEY (service account credentials, a JSON file)
    - GCP_PROJECT (project id)


## Author

👤 **Logan Hauspie**

* Twitter: [@lhauspie](https://twitter.com/lhauspie)
* Github: [@lhauspie](https://github.com/lhauspie)

## Contributors

👤 **Roman Acevedo**

* Github: [@AcevedoR](https://github.com/AcevedoR)

👤 **Douglas Six**

* Twitter: [@sixdouglas](https://twitter.com/sixdouglas)
* Github: [@sixdouglas](https://github.com/sixdouglas)

## 🤝 Contributing

Contributions, issues and feature requests are welcome!<br />Feel free to check [issues page](https://github.com/Zenika/lilaobot/issues). 

## Show your support

Give a ⭐️ if this project helped you!

***
_This README was generated with ❤️ by [readme-md-generator](https://github.com/kefranabg/readme-md-generator)_