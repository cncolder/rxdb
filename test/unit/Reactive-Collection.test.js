import assert from 'assert';
import {
    default as clone
} from 'clone';
import {
    default as memdown
} from 'memdown';

import * as schemas from '../helper/schemas';
import * as schemaObjects from '../helper/schema-objects';
import * as humansCollection from '../helper/humans-collection';

import * as RxDatabase from '../../dist/lib/RxDatabase';
import * as RxSchema from '../../dist/lib/RxSchema';
import * as RxCollection from '../../dist/lib/RxCollection';
import * as util from '../../dist/lib/util';
import AsyncTestUtil from 'async-test-util';


describe('Reactive-Collection.test.js', () => {
    describe('.insert()', () => {
        describe('positive', () => {
            it('should get a valid event on insert', async() => {
                const db = await RxDatabase.create({
                    name: util.randomCouchString(10),
                    adapter: 'memory'
                });
                const colName = 'foobar';
                const c = await db.collection({
                    name: colName,
                    schema: schemas.human
                });

                c.insert(schemaObjects.human());
                const changeEvent = await c.$.first().toPromise();
                assert.equal(changeEvent.constructor.name, 'RxChangeEvent');
                assert.equal(changeEvent.data.col, colName);
                assert.equal(typeof changeEvent.data.doc, 'string');
                assert.ok(changeEvent.data.v);
                db.destroy();
            });
        });
        describe('negative', () => {
            it('should get no event on non-succes-insert', async() => {
                const db = await RxDatabase.create({
                    name: util.randomCouchString(10),
                    adapter: 'memory'
                });
                const c = await db.collection({
                    name: 'foobar',
                    schema: schemas.human
                });
                let calls = 0;
                db.$.subscribe(e => {
                    calls++;
                });
                await AsyncTestUtil.assertThrows(
                    () => c.insert({
                        foo: 'baar'
                    }),
                    Error
                );
                assert.equal(calls, 0);
                db.destroy();
            });
        });
    });
    describe('.remove()', () => {
        describe('positive', () => {
            it('should fire on remove', async() => {
                const c = await humansCollection.create(0);
                const q = c.find();
                let ar = [];
                const sub = q.$
                    .subscribe(docs => {
                        ar.push(docs);
                    });

                // nothing is fired until no results
                assert.equal(ar.length, 0);

                // empty array since no documents
                await AsyncTestUtil.waitUntil(() => ar.length == 1);

                assert.deepEqual(ar[0], []);

                await c.insert(schemaObjects.human());
                await AsyncTestUtil.waitUntil(() => ar.length == 2);

                const doc = await c.findOne().exec();
                await doc.remove();
                await AsyncTestUtil.waitUntil(() => ar.length == 3);
                sub.unsubscribe();
                c.database.destroy();
            });
        });
    });
});
