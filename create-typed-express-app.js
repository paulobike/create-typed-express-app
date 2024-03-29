const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');
const readline = require('readline');
const chalk = require('chalk');
const { Command } = require('commander');
const validateNpmPackageName = require('validate-npm-package-name');

const packageJson = require('./package.json');
const { directories, files, scripts } = require('./templates');
const dependencies = ['express'];
const devDependencies = ['typescript', 'nodemon', 'ts-node', '@types/express', '@types/node']

const init = async (hrtime) => {
    let directory, options;
    const program = new Command(packageJson.name);

    program.version(packageJson.version)
    .description(packageJson.description)
    .argument('<directory>', 'The new typescript app directory')
    .option('--strict', 'Turns on typescript strict type checking mode')
    .option('-y', 'Skip npm init')
    .action((dir, opts) => {
        directory = dir;
        options = opts
    })
    .usage(chalk.green(' <directory>') + chalk.yellowBright(' [options]'))
    .parse(process.argv)

    const root = path.resolve(directory);
    const projectName = path.basename(root);
    /** CHECK IF DIRECTORY NAME IS VALID */
    if(!validateDirName(projectName, devDependencies.concat(dependencies))) {
        selfDestruct(
            null,
            chalk.red(
              `Cannot create a project named ${chalk.green(
                `"${projectName}"`
              )} either because it does not meet npm naming prescriptions or a dependency with the same name exists.\n` +
                `Due to the way npm works, the following names are not allowed:\n\n`
            ) +  chalk.yellowBright(dependencies.map(depName => `  ${depName}`).join('\n')) +
            chalk.red('\n\nPlease use a different project name.'),
            1
        );
    }

    console.log(`Creating a new typed Express app in ${chalk.green(root)}.`);

    /** CREATE PROJECT DIRECTORY */
    if (!fs.existsSync(root)){
        fs.mkdirSync(root, { recursive: true });
    }

    process.chdir(root);

    /** LISTEN FOR SIGINT AND CLEANUP */
    process.on('SIGINT', signal => {
        selfDestruct(root, '\nInterrupted by user ^C', 1);
    });
    

    /** RUN NPM INIT */
    let npmInitSuccess = await initNPM(!!options.y);
    if(!npmInitSuccess) {
        selfDestruct(root, 'Failed to initialize project', 1);
    }

    /** INSTALL NECESSARY PACKAGES */

    // Dependencies
    let animation, packageInstall;
    animation = displayAnimation(chalk.cyan('Installing necessary dependencies'));
    packageInstall = await installPackages(process.cwd(), dependencies, false);
    clearTimeout(animation);
    if(!packageInstall) {
        selfDestruct(root, 'Failed to install dependencies', 1);
    }
    console.log(chalk.green('✓ Done.\n'))
    //Dev dependencies
    animation = displayAnimation(chalk.cyan('Installing necessary dev dependencies'));
    packageInstall = await installPackages(process.cwd(), devDependencies, true);
    clearTimeout(animation);
    if(!packageInstall) {
        selfDestruct(root, 'Failed to install dev dependencies', 1);
    }
    console.log(chalk.green('✓ Done.\n'))
    /** CREATE DIRECTORY STRUCTURE */
    createTsDirs(process.cwd(), directories, files, !!options.strict);

    /** SETUP NPM SCRIPTS */
    createScripts(process.cwd(), scripts);
    let duration = process.hrtime(hrtime);
    console.log(
        chalk.green(`\ncreate-typed-express-app done  `) + 
        chalk.cyan(`-${Math.round(((duration[0] + (duration[1]/1e+9)) * 100)) / 100}s\n\n`) +
        `To start the development server;\n\nrun ${chalk.bgRed(chalk.cyan('cd ' + root + ' && npm run dev'))} `
    )
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
        let npmInit = spawn('npm', args, { shell: true });
        npmInit.stdout.pipe(process.stdout);
        npmInit.stderr.pipe(process.stderr);
        
        let line = readline.createInterface({input: process.stdin});

        line.on('line', data => {
            npmInit.stdin.write(data + '\n');
        }); 

        npmInit.on('close', (code) => {
            line.close();
            npmInit.stdin.end();
            resolve(code === 0? true: false);
        });

        npmInit.on('error', err => {
            console.log('Oops! it seems npm cannot be found on your system\n');
        });
    });    
}

function installPackages(cwd, packages, dev) {
    return new Promise(resolve => {
        let packageInstall = spawn('npm', ['install', '--no-audit', '--save' + (dev? '-dev': ''), ...packages], { cwd, shell: true });
        packageInstall.stdout.pipe(process.stdout);
        packageInstall.stderr.pipe(process.stderr);

        packageInstall.on('close', (code) => resolve(code === 0? true: false));

        packageInstall.on('error', err => {
            console.log('Oops! it seems npm cannot be found on your system\n');
        });
    });
}

function createTsDirs(cwd, tsDirectories, tsFiles, strictMode) {
    // Initialize typescript
    let projectPackageJson = require(path.join(cwd, 'package.json'));
    let tsOptions = ['tsc', '--init'];
    if(strictMode) tsOptions.push('--strict');
    let tsInit = spawn('npx', tsOptions, { cwd, shell: true });
    tsInit.on('error', err => {
        console.log('Oops! it seems npm cannot be found on your system\n');
    });

    // Create directories
    for(let directory of tsDirectories) {
        fs.mkdirSync(path.join(cwd, directory), {recursive: true});
    }
    
    // Name entry file
    let main = projectPackageJson && projectPackageJson.main? 
    `src/${projectPackageJson.main.split('.')[0] + '.ts'}`: 'src/index.ts';
    tsFiles.entryFile.path = main;
    
    // Create project files
    for(let file in tsFiles) {
        fs.writeFileSync(path.join(cwd, tsFiles[file].path), tsFiles[file].template);
    }
}

function createScripts(cwd, projectScripts) {
    let projectPackageJson = require(path.join(cwd, 'package.json'));
    if(projectPackageJson.main) {
        projectScripts.dev = projectScripts.dev.replace('{{entryFile}}', projectPackageJson.main.split('.')[0] + '.ts');
        projectScripts.start = projectScripts.start.replace('{{entryFile}}', projectPackageJson.main);
    }

    // Rename package name
    projectPackageJson.main = 'dist/' + projectPackageJson.main;

    projectPackageJson.scripts = { ...projectPackageJson.scripts, ...projectScripts };
    fs.writeFileSync(path.join(cwd, 'package.json'), JSON.stringify(projectPackageJson, null, 2));
}

function displayAnimation(text = '') {
    var items = ["⠙", "⠘", "⠰", "⠴", "⠤", "⠦", "⠆", "⠃", "⠋", "⠉"];
    var curr = 0;
    return setInterval(function() {
        process.stdout.write("\r" + items[curr++] + " " + text);
        curr %= 10;
    }, 100);
}

function selfDestruct(project, message, exitCode) {
    if(message) console.error(chalk.redBright(message))
    if(project) {
        console.log(chalk.yellowBright('\nCleaning up... '));
        fs.rmSync(project, { recursive: true });
    }
    if(exitCode) {
        console.error(chalk.redBright('\nExiting with status code ' + exitCode));
        process.exit(exitCode);
    }
}

module.exports.init = init;