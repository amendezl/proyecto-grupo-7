#!/usr/bin/env node
// Script to manually clean up orphaned CloudWatch log groups
// Run this script if you encounter log group conflicts during deployment

const { CloudWatchLogsClient, DescribeLogGroupsCommand, DeleteLogGroupCommand } = require('@aws-sdk/client-cloudwatch-logs');

const client_region = process.argv[2] || 'us-east-1';
const client = new CloudWatchLogsClient({ region: client_region });


async function cleanupOrphanedLogGroups() {
  try {
    console.log(` Searching for orphaned gestion-espacios log groups in region ${client_region}...`);
    
    // Get all log groups that match our application pattern
    const command = new DescribeLogGroupsCommand({
      logGroupNamePrefix: '/aws/lambda/sistema-gestion-espacios-dev-dynamoStreamProcessor'
    });
    
    const response = await client.send(command);
    const logGroups = response.logGroups || [];
    
    if (logGroups.length === 0) {
      console.log(' No orphaned log groups found!');
      return;
    }
    
    console.log(` Found ${logGroups.length} log groups to clean up:`);
    logGroups.forEach(lg => console.log(`  - ${lg.logGroupName}`));
    
    // Delete each log group
    for (const logGroup of logGroups) {
      try {
        await client.send(new DeleteLogGroupCommand({
          logGroupName: logGroup.logGroupName
        }));
        console.log(`  Deleted: ${logGroup.logGroupName}`);
      } catch (error) {
        if (error.name === 'ResourceNotFoundException') {
          console.log(`  Already deleted: ${logGroup.logGroupName}`);
        } else {
          console.error(`X Failed to delete ${logGroup.logGroupName}:`, error.message);
        }
      }
    }
    
    console.log('\n Log group cleanup completed!');
    console.log(' You can now run "npm run deploy" safely.');
    
  } catch (error) {
    console.error('X Error during cleanup:', error.message);
    process.exit(1);
  }
}

// Run the cleanup if this script is executed directly
if (require.main === module) {
  cleanupOrphanedLogGroups();
}

module.exports = { cleanupOrphanedLogGroups };