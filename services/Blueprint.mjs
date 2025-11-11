import sequelize, { MAX_SEARCH_LEN } from '#root/services/Sequelize.mjs';
import _ from 'lodash';
import { Op } from 'sequelize';

export default {
  async get(
    Model,
    idStr,
    { limit: limitStr, offset: offsetStr, include, order, where }
  ) {
    const id = parseInt(idStr, 10);
    const limit = parseInt(limitStr, 10);
    const offset = parseInt(offsetStr, 10);
    let includeClause, whereClause;

    if (include) {
      includeClause = _.isString(include) ? JSON.parse(include) : include;
    }
    if (where) {
      whereClause = _.isString(where) ? JSON.parse(where) : where;
    }

    if (id && _.isInteger(id)) {
      return Model.findOne({
        where: { id },
        ...(!_.isNil(includeClause) && { include: includeClause }),
      });
    }

    const options = this.fixWhereInclude(whereClause, includeClause);
    const query = {
      ...options,
      ...(_.isInteger(offset) && { offset }),
      ...(_.isInteger(limit) && { limit }),
      ...(!_.isNil(order) && { order }),
      distinct: true,
    };

    const res = await Model.findAndCountAll(query);

    if (_.isFunction(Model.toJSON)) res.rows = res.rows.map(Model.toJSON);

    return res;
  },
  async create(Model, data) {
    return Model.create(data);
  },
  async update(Model, idStr, data, fields = []) {
    const id = parseInt(idStr, 10);
    if (!_.isInteger(id)) throw 'Wrong parameters';

    const item = await Model.findOne({ where: { id } });
    if (!item) throw 'Item not found';

    const fieldsToUpdate = fields.length > 0 ? fields : Object.keys(data);

    fieldsToUpdate.forEach((f) => {
      item[f] = data[f];
    });

    await item.save({ fields: fieldsToUpdate });

    return item;
  },
  async delete(Model, idStr) {
    const id = parseInt(idStr, 10);
    if (!_.isInteger(id)) throw 'Wrong parameters';
    const item = await Model.findOne({ where: { id } });
    if (!item) throw 'Item not found';

    await item.destroy();
  },
  fixWhereInclude(where = {}, include) {
    const fixedWhere = addWhereOp(where);
    const newWhere = {};
    Object.keys(fixedWhere).forEach((key) => {
      newWhere[key] = fixedWhere[key];
    });
    Object.getOwnPropertySymbols(fixedWhere).forEach((sym) => {
      newWhere[sym] = fixedWhere[sym];
    });

    const newInclude = Array.isArray(include) ? _.cloneDeep(include) : [];
    for (const key of Object.keys(newWhere)) {
      if (key.startsWith('$') && key.endsWith('$')) {
        const withoutDollars = key.slice(1, -1);

        const aliasChain = withoutDollars.split('->');
        let lastPart = aliasChain.pop();

        let lastAlias, field;
        if (lastPart.includes('.')) {
          [lastAlias, field] = lastPart.split('.');
        } else {
          lastAlias = lastPart;
          field = null; // error handling
        }

        aliasChain.push(lastAlias);
        const conditionValue = newWhere[key];
        delete newWhere[key];

        let parentIncludeArray = newInclude;
        let currentInclude = {};

        for (const alias of aliasChain) {
          currentInclude = parentIncludeArray.find(
            (inc) => inc.association === alias
          );

          if (!currentInclude) {
            currentInclude = {
              association: alias,
              include: [],
            };
            parentIncludeArray.push(currentInclude);
          }

          if (!Array.isArray(currentInclude.include)) {
            currentInclude.include = [];
          }
          parentIncludeArray = currentInclude.include;
        }

        if (!currentInclude.where) {
          currentInclude.where = {};
        }
        if (field) {
          if (!currentInclude.where[field]) {
            currentInclude.where[field] = conditionValue;
          } else {
            // Maybe merge?
          }
        }
      }
    }
    return {
      where: newWhere,
      include: newInclude,
    };
  },
  removeIncludeAttributes(model, include) {
    if (!Array.isArray(include)) {
      return [];
    }
    return include.map((inc) => {
      if (_.isString(inc))
        return {
          association: inc,
          ...(model.associations[inc]?.throughModel
            ? { attributes: [], through: { attributes: [] } }
            : { attributes: [] }),
        };
      const { include, ...rest } = inc;

      const newInc = {
        ...rest,
        attributes: [],
      };
      if (include) {
        newInc.include = this.removeIncludeAttributes(model, include);
      }

      return newInc;
    });
  },
};

function normalizeLikeValue(v) {
  if (v == null) return '';
  return `%${sequelize.sanitizeLike(v, MAX_SEARCH_LEN)}%`;
}

const LIKE_OPS = new Set([Op.like, Op.iLike, Op.notLike, Op.notILike]);

function addWhereOp(where) {
  if (!_.isObject(where)) return where;
  if (_.isArray(where)) return where.map((clause) => addWhereOp(clause));

  const newWhere = {};
  for (const key in where) {
    const rawVal = where[key];
    let val = addWhereOp(rawVal);
    let newKey = key;
    if (/^Op\./.test(key)) {
      const opName = key.split('.')[1];
      newKey = Op[opName];
      if (['like', 'iLike', 'notLike', 'notILike'].includes(opName))
        if (_.isString(val)) val = normalizeLikeValue(val);
    }
    newWhere[newKey] = val;
  }
  Object.getOwnPropertySymbols(where).forEach((sym) => {
    let val = where[sym];
    if (LIKE_OPS.has(sym) && _.isString(val)) val = normalizeLikeValue(val);
    newWhere[sym] = val;
  });

  return newWhere;
}
