import {Catch, ArgumentsHost, HttpStatus} from '@nestjs/common';
import {BaseExceptionFilter} from '@nestjs/core';
import {WebsocketGateway} from './websocket.gateway';
import {Response} from 'express';

@Catch()
export class ErrorHandler extends BaseExceptionFilter {

    constructor(
        private readonly eventsGateway: WebsocketGateway
    ) {
        super();
    }

    catch(exception: any, host: ArgumentsHost) {
        console.warn("error caught: ", exception);

        const ctx = host.switchToHttp();
        const response: Response = ctx.getResponse();

        let status = HttpStatus.INTERNAL_SERVER_ERROR;

        if (exception.status === HttpStatus.NOT_FOUND) {
            status = HttpStatus.NOT_FOUND;
        }

        if (exception.status === HttpStatus.SERVICE_UNAVAILABLE) {
            status = HttpStatus.SERVICE_UNAVAILABLE;
        }

        if (exception.status === HttpStatus.NOT_ACCEPTABLE) {
            status = HttpStatus.NOT_ACCEPTABLE;
        }

        if (exception.status === HttpStatus.EXPECTATION_FAILED) {
            status = HttpStatus.EXPECTATION_FAILED;
        }

        if (exception.status === HttpStatus.BAD_REQUEST) {
            status = HttpStatus.BAD_REQUEST;
        }

        response.status(status).send();

        if (status >= 500) {
            this.eventsGateway.disconnectAll();
        }
    }
}
