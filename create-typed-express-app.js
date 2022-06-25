const path = require('path');
const fs = require('fs');
const { spawn, execSync} = require('child_process');
const readline = require('readline');
const chalk = require('chalk');
const { Command } = require('commander');
const validateNpmPackageName = require('validate-npm-package-name');

const packageJson = require('./package.json');
const { directories, files } = require('./templates');
const dependencies = ['express'];
const devDependencies = ['typescript', 'nodemon', '@types/express', '@types/node']

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
    /** CHECK IF DIRECTORY NAME IS VALID */
    if(!validateDirName(projectName, devDependencies.concat(dependencies))) {
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

    // Dependencies
    let animation, packageInstall;
    animation = displayAnimation('Installing necessary dependencies');
    packageInstall = await installPackages(dependencies);
    clearTimeout(animation);
    if(!packageInstall) {
        process.exit(1);
    }
    //Dev dependencies
    animation = displayAnimation('Installing necessary dev dependencies');
    packageInstall = await installPackages(devDependencies);
    clearTimeout(animation);
    if(!packageInstall) {
        process.exit(1);
    }
    /** CREATE DIRECTORY STRUCTURE */
    createTsDirs(process.cwd(), directories, files);

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
            resolve(code === 0? true: false);
        });
    });    
}

function installPackages(packages, dev) {
    return new Promise(resolve => {
        let packageInstall = spawn('npm', ['install', ...packages, '--save' + dev&'-dev']);
        packageInstall.stdout.pipe(process.stdout);
        packageInstall.stderr.pipe(process.stderr);

        packageInstall.on('close', (code) => resolve(code === 0? true: false));
    });
}

function createTsDirs(cwd, tsDirectories, tsFiles) {
    // Initialize typescript
    let projectPackageJson = require(path.join(cwd, 'package.json'));
    let initTs = execSync('npx', ['tsc', '--init']);

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

function displayAnimation(text = '') {
    var items = ["⠙", "⠘", "⠰", "⠴", "⠤", "⠦", "⠆", "⠃", "⠋", "⠉"];
    var curr = 0;
    return setInterval(function() {
        process.stdout.write("\r" + items[curr++] + " " + text);
        curr %= 10;
    }, 100);
}

module.exports.init = init;