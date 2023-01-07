const entryFile = {
    template: `import http from 'http';
import express, { Response, Application, NextFunction } from 'express';
import indexRouter from './routers';
import { ResponseErrorType, ResponseData } from './types';
import env from './functions/env';

/** PARSE .ENV FILE */
const envResp = env();
const app :Application = express();
app.use(express.urlencoded({ extended: true }))
app.use(express.json());

const PORT :number = Number(process.env.PORT) || 3000;
const IP :string = process.env.IP || '127.0.0.1';

/** DO ROUTING HERE */
app.use('/', indexRouter);

/** ERROR HANDILING MIDDLEWARE */
app.use((error :ResponseErrorType, _:any, res :Response, __:any) :void => {
    let errorResponseBody :ResponseData = {
        status: error.status,
        data: null,
        message: error.message
    }
    res.json(errorResponseBody);
});

const server = http.createServer(app);

server.listen(PORT, IP, () :void => {
    console.log(envResp);
    console.log('App running at port ' + PORT);
});`,
    path: 'src/index.ts'
}

const types = {
    template: `/** TYPE OF DATA THAT GOES INTO RES.JSON() */
interface ResponseData {
    status :Number,
    message? :String,
    data :any
}

/** TYPE OF ERROR THAT GOES INTO ERROR HANDLING MIDDLEWARE */
interface ResponseErrorType extends Error {
    status :number
}

export { ResponseData, ResponseErrorType }`,
    path: 'src/types.ts'
}

const indexRouter = {
    template: `import express, { Router, RouterOptions } from 'express';
import { notFoundController, indexController } from '../controllers';

const routerOptions :RouterOptions = {
    mergeParams: true,
    strict: false,
    caseSensitive: true,
}

const router :Router = express.Router(routerOptions);

/** DO NESTED ROUTING HERE */
router.get('/', indexController);

router.use('*', notFoundController);

export default router;`,
    path: 'src/routers/index.ts'
}

const indexController = {
    template: `import { NextFunction, Request, Response } from "express";
import { ResponseData } from '../types';
import ResponseError from '../classes/ResponseError';

const indexController = (req :Request, res :Response, next :NextFunction) :void => {
    let response :ResponseData = {
        status: 200,
        message: 'success',
        data: 'Hello World'
    }
    res.json(response);
}

const notFoundController = (req :Request, res :Response, next :NextFunction) :void => {
    let responseError = new ResponseError('not found', 404);
    next(responseError);
}

export { indexController, notFoundController }`,
    path: 'src/controllers/index.ts'
}

const env = {
    template: `const fs = require('fs');
const path = require('path');

const env = () :string=> {
    let dotenvPath :string = path.resolve(process.cwd(), '.env');
    let data :string;
    try {        
        data = fs.readFileSync(dotenvPath, 'utf8');
    }
    catch (err) {
        return 'Couldn\\'t load .env file.';
    }
    importEnv(data);
    return 'Found .env file. OK';
}

const importEnv = (data :string) :void => {
    data.split('\\n').forEach(variable => {
        let keyVal = variable.trim().split('=');
        let value;
        value = keyVal[1]
        process.env[keyVal[0]] = value;
    });
}

export default env;`,
    path: 'src/functions/env.ts'
}

const responseErrorClass = {
    template: `import { ResponseErrorType } from "../types";

/** ERROR CLASS THAT GOES INTO ERROR HANDLING MIDDLEWARE */
class ResponseError extends Error implements ResponseErrorType {
    status :number;

    constructor(message :string, status :number) {
        super(message);
        this.status = status;
    }
}

export default ResponseError;`,
    path: 'src/classes/ResponseError.ts'
}

const dotenv = {
    template: `IP=127.0.0.1\nPORT=3000`,
    path: 'src/.env'
}

const dotenvjs = {
    template: dotenv.template,
    path: 'dist/.env'
}

module.exports.files = { 
    entryFile,
    types,
    indexRouter,
    env,
    responseErrorClass,
    dotenv,
    dotenvjs,
    indexController
};

module.exports.directories = [
    'dist',
    'src/classes',
    'src/functions',
    'src/routers',
    'src/controllers'
]

module.exports.scripts = {
    dev: "npx nodemon src/{{entryFile}}",
    build: "npx tsc",
    start: "npm run build && node dist/{{entryFile}}"
}