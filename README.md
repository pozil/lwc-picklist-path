# A LWC path component that works with any picklist field


## Install
If you are on MacOS or Linxu, run

```
sh install.dev
```

Otherwise, type the following commands:


1. Create a scratch org and provide it with an alias (**path** in the command below):

```
sfdx force:org:create -s -f config/project-scratch-def.json -a path
```

2. Push the app to your scratch org:

```
sfdx force:source:push
```

3. Open the scratch org:

```
sfdx force:org:open
```

## Configuration
1. Edit a record page with the **Lighning App Builder**
1. Place the **Picklist Path** component on the page.
2. Set the **Qualified Field Name** parameter to one of the object picklist field. The field name must be qualified (eg: `Account.Type` or `Dummy__c.Stage__c`).