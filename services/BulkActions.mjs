import ResearchItem from '#root/models/ResearchItem.mjs';
import sequelize from '#root/services/Sequelize.mjs';

export async function bulkActions({
  action,
  actionParams,
  itemsIds,
  findModel = ResearchItem,
  where,
  include = [],
  selectAll,
  itemKey = 'researchItemId',
  selectAllItemKey = 'id',
  transaction,
}) {
  let itemsToProcess = [];

  if (selectAll) {
    try {
      const allItems = await findModel.findAll({
        where,
        include,
        attributes: [selectAllItemKey],
        transaction,
      });
      itemsToProcess = [
        ...new Set(allItems.map((item) => item[selectAllItemKey])),
      ];
    } catch (error) {
      return {
        successes: { count: 0, ids: [] },
        errors: [{ type: error || 'UnknownError', count: 1 }],
      };
    }
  } else {
    itemsToProcess = itemsIds;
  }

  let successCount = 0;
  const successIds = [];
  const failures = {};

  for (let i = 0; i < itemsToProcess.length; i++) {
    let itemTransaction;
    try {
      itemTransaction = await sequelize.transaction();
      await action({
        ...actionParams,
        [itemKey]: itemsToProcess[i],
        transaction: itemTransaction,
      });
      await itemTransaction.commit();

      successCount++;
      successIds.push(itemsToProcess[i]);
    } catch (error) {
      if (itemTransaction) await itemTransaction.rollback();
      if (failures[error]) {
        failures[error] += 1;
      } else {
        failures[error] = 1;
      }
    }
  }

  return {
    successes: { count: successCount, ids: successIds },
    failures,
  };
}
