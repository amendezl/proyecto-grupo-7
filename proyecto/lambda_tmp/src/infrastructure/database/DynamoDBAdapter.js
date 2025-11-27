const { GetCommand, PutCommand } = require('@aws-sdk/lib-dynamodb');
const DynamoDBManager = require('./DynamoDBManager');

class DynamoDBAdapter {
    constructor() {
        this.manager = new DynamoDBManager();
        this.tableName = this.manager.tableName;
    }

    /**
     * @param {string} PK
     * @param {string} SK
     */
    async getItem(PK, SK) {
        const command = new GetCommand({
            TableName: this.tableName,
            Key: { PK, SK }
        });

        const result = await this.manager.executeCommand(command, { operation: 'getItem', pk: PK, sk: SK });
        return result && result.Item ? result.Item : null;
    }

    /**
     * @param {Object} item
     */
    async putItem(item) {
        const command = new PutCommand({
            TableName: this.tableName,
            Item: item
        });

        await this.manager.executeCommand(command, { operation: 'putItem', pk: item.PK, sk: item.SK });
        return item;
    }
}

module.exports = DynamoDBAdapter;
