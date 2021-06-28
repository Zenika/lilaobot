# TODO list
## get:secrets on Function Service Account
I had to mannualy add permission to access secrets on the default Service Account used to execute the Function : 
```
gcloud secrets add-iam-policy-binding slack-bot-token \
    --role roles/secretmanager.secretAccessor \
    --member serviceAccount:lilaobot@appspot.gserviceaccount.com
```