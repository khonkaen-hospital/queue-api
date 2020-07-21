/// <reference path="../../typings.d.ts" />

import * as Knex from 'knex';
import * as fastify from 'fastify';
import * as HttpStatus from 'http-status-codes';
import { Random } from "random-js";

import { PrioritiesServicepointModel } from '../models/priorities_servicepoint';

const model = new PrioritiesServicepointModel();

const router = (fastify, { }, next) => {
    var db: Knex = fastify.db;

    fastify.get('/servicepoint/:id', { preHandler: [fastify.authenticate] }, async (req: fastify.Request, reply: fastify.Reply) => {
        let servicePointId = req.params.id;
        try {
            const rs: any = await model.listByServicePoint(db, servicePointId);
            reply.status(HttpStatus.OK).send({ statusCode: HttpStatus.OK, results: rs })
        } catch (error) {
            fastify.log.error(error);
            reply.status(HttpStatus.INTERNAL_SERVER_ERROR).send({ statusCode: HttpStatus.INTERNAL_SERVER_ERROR, message: HttpStatus.getStatusText(HttpStatus.INTERNAL_SERVER_ERROR) })
        }
    })

    next();

}

module.exports = router;