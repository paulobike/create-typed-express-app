# create-typed-express-app

A program that gets you on the go with a typescript express app template

## Installation
Install globally with `npm install -g create-typed-express-app`

## Usage
1. Create a new express typescript app:

	`create-typed-express-app  <directory> [options]`

1.  Display help page

	`create-typed-express-app  -h`

##  Options
- `--strict`:  Initialize project with typescript strict type checking mode

- `-y`:  Force skip the npm init process

- `-h, --help`:  Display help page

## Example:
To create a basic `hello-world` app:

`create-typed-express-app hello-world -y`

It will create a directory called `hello-world` in the current directory, setup the folder structure and install necessary dependencies.

The folder structure would look like this:

```
hello-world
    ├── tsconfig.json
    ├── package.lock.json
    ├── package.json
    ├── node_modules
    ├── dist
    │   └──  .env
    └── src
           ├── index.ts
           ├── types.ts
           ├── .env
           ├── classes
                    └──  ResponseError.ts
           ├── controllers
                    └──  index.ts
           ├── functions
                    └──  env.ts
           └── routers
                    └──  routers.ts
```

## Caveats
- App naming **must** follow  [npm naming rules](https://github.com/npm/validate-npm-package-name#naming-rules "npm naming rules")