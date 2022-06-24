const path = require('path');
const fs = require('fs');
const { spawn, execSync} = require('child_process');
const readline = require('readline');
const chalk = require('chalk');
const { Command } = require('commander');
const validateNpmPackageName = require('validate-npm-package-name');

const packageJson = require('./package.json');
const dependencies = ['typescript', 'express'];

const init = async () => {
    let directory, options;
    const program = new Command(packageJson.name);

    program.version(packageJson.version)
    .description(packageJson.description)
    .argument('<directory>', 'The new typescript app directory')
    .option('--severity [value]', 'The level of severity of typescript type check')
    .option('-y', 'Skip npm init')
    .action((dir, opts) => {
        directory = dir;
        options = opts
    })
    .usage(chalk.green(' <directory>') + chalk.yellowBright(' [options]'))
    .parse(process.argv)

    const root = path.resolve(directory);
    const projectName = path.basename(root);
    console.log(directory, root, projectName)
    /** CHECK IF DIRECTORY NAME IS VALID */
    if(!validateDirName(projectName, dependencies)) {
        console.error(
            chalk.red(
              `Cannot create a project named ${chalk.green(
                `"${projectName}"`
              )} either because it does not meet npm naming prescriptions or a dependency with the same name exists.\n` +
                `Due to the way npm works, the following names are not allowed:\n\n`
            ) +
              chalk.yellowBright(dependencies.map(depName => `  ${depName}`).join('\n')) +
              chalk.red('\n\nPlease use a different project name.')
        );
        process.exit(1);
    }
    console.log(`Creating a new typed Express app in ${chalk.green(root)}.`);

    /** CREATE PROJECT DIRECTORY */
    if (!fs.existsSync(root)){
        fs.mkdirSync(root, { recursive: true });
    }    
    process.chdir(root);

    /** RUN NPM INIT */
    let npmInitSuccess = await initNPM(!!options.y);
    if(!npmInitSuccess) {
        process.exit(1);
    }

    /** INSTALL NECESSARY PACKAGES */

    /** CREATE DIRECTORY STRUCTURE */

    /** SETUP NPM SCRIPTS */
}

function validateDirName(name, dependencyList) {
    let isValidNpmDirName = validateNpmPackageName(name).validForNewPackages;
    let isNotDependencyName = !dependencyList.includes(name);
    return isValidNpmDirName && isNotDependencyName;
}

function initNPM(skip) {
    return new Promise(resolve => {
        let args = ['init'];
        skip && args.push('-y');
        let npmInit = spawn('npm', args);
        npmInit.stdout.pipe(process.stdout)
        npmInit.stderr.pipe(process.stderr)
        
        let line = readline.createInterface({input: process.stdin});

        line.on('line', data => {
            npmInit.stdin.write(data + '\n');
        }); 

        npmInit.on('close', (code) => {
            line.close();
            npmInit.stdin.end();
            resolve(code === 0? true: false)
        });
    });    
}

function createTsDirs() {
    execSync('ty')
}

module.exports.init = init;