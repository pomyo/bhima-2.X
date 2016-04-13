/**
* The /vouchers HTTP API endpoint
*
* @module finance/vouchers
*
* @description This module is responsible for handling CRUD operations
* against the `voucher` table.
*
* @requires lodash
* @requires node-uuid
* @requires lib/util
* @requires lib/db
* @requires lib/errors/NotFound
*/

var _    = require('lodash');
var uuid = require('node-uuid');
var util = require('../../lib/util');
var db   = require('../../lib/db');
var NotFound = require('../../lib/errors/NotFound');
var BadRequest = require('../../lib/errors/BadRequest');

/** Get list of vouchers */
exports.list = list;

/** Get detail of vouchers */
exports.detail = detail;

/** Create a new voucher record */
exports.create = create;

/**
* GET /vouchers
*
* @method list
*/
function list(req, res, next) {
  var query =
    'SELECT BUID(v.uuid) as uuid, v.date, v.project_id, v.reference, v.currency_id, v.amount, ' +
      'v.description, BUID(v.document_uuid) as document_uuid, ' +
      'v.user_id, BUID(vi.uuid) AS voucher_item_uuid, ' +
      'vi.account_id, vi.debit, vi.credit ' +
    'FROM voucher v JOIN voucher_item vi ON vi.voucher_uuid = v.uuid ';

  // convert binary params if they exist
  if (req.query.document_uuid) {
    req.query.document_uuid = db.bid(req.query.document_uuid);
  }

  // format query parameters appropriately
  var builder = util.queryCondition(query, req.query);

  db.exec(builder.query, builder.conditions)
  .then(function (rows) {
    res.status(200).json(rows);
  })
  .catch(next)
  .done();
}

/**
* GET /vouchers/:uuid
*
* @method detail
*/
function detail(req, res, next) {
  var query =
    'SELECT BUID(v.uuid) as uuid, v.date, v.project_id, v.reference, v.currency_id, v.amount, ' +
      'v.description, v.document_uuid, v.user_id, BUID(vi.uuid) AS voucher_item_uuid, ' +
      'vi.account_id, vi.debit, vi.credit ' +
    'FROM voucher v JOIN voucher_item vi ON vi.voucher_uuid = v.uuid ' +
    'WHERE v.uuid = ?;';

  var id = db.bid(req.params.uuid);

  db.exec(query, id)
  .then(function (rows) {
    if (!rows.length) {
      throw new NotFound('Could not find a voucher with id ' + req.params.id);
    }
    res.status(200).json(rows[0]);
  })
  .catch(next)
  .done();
}


/**
* POST /vouchers
*
* @method create
*/
function create(req, res, next) {

  // alias both the voucher and the voucher items
  var voucher = req.body.voucher;
  var items = req.body.voucher.items || [];

  // a voucher without two items doesn't make any sense in double-entry
  // accounting.  Therefore, throw a bad data error if there are any fewer
  // than two items in the journal voucher.
  if (items.length < 2) {
    return next(
      new BadRequest(
        'Expected there to be at least two items, but ' +
        'only received ? items.'.replace('?', items.length)
      )
    );
  }

  // remove the voucher items from the request before insertion into the
  // database
  delete voucher.items;

  // convert dates to a date objects
  if (voucher.date) {
    voucher.date = new Date(voucher.date);
  }

  // convert the document uuid if it exists
  if (voucher.document_uuid) {
    voucher.document_uuid = db.bid(voucher.document_uuid);
  }

  // make sure the voucher has an id
  var uid = voucher.uuid || uuid.v4();
  voucher.uuid = db.bid(uid);

  // preprocess the items so they have uuids as required
  items.forEach(function (item) {

    // if the item doesn't have a uuid, create one for it.
    item.uuid = db.bid(item.uuid || uuid.v4());

    // make sure the items reference the voucher correctly
    item.voucher_uuid = db.bid(item.voucher_uuid || uid);
  });

  // map items into an array of arrays
  items = _.map(items, util.take('uuid', 'account_id', 'debit', 'credit', 'voucher_uuid'));

  // initialise the transaction handler
  var txn = db.transaction();

  // build the SQL query
  txn
    .addQuery('INSERT INTO voucher SET ?', [ voucher ])
    .addQuery('INSERT INTO voucher_item (uuid, account_id, debit, credit, voucher_uuid) VALUES ?', [ items ]);

  // execute the transaction
  txn.execute()
  .then(function (rows) {
    res.status(201).json({
      uuid: uid
    });
  })
  .catch(next)
  .done();
}