#!/usr/bin/env node

/**
 * Script to empty an S3 bucket (remove all objects and versions)
 * Usage: node empty-s3-bucket.js <bucket-name> <region>
 */

const AWS = require('aws-sdk');

const bucketName = process.argv[2];
const region = process.argv[3] || 'us-east-1';

if (!bucketName) {
  console.error('Error: Bucket name is required');
  console.error('Usage: node empty-s3-bucket.js <bucket-name> <region>');
  process.exit(1);
}

const s3 = new AWS.S3({ region });

async function emptyBucket() {
  try {
    console.log(`Starting to empty bucket: ${bucketName}`);

    // List and delete all object versions
    let isTruncated = true;
    let keyMarker = undefined;
    let versionIdMarker = undefined;

    while (isTruncated) {
      const listParams = {
        Bucket: bucketName,
        KeyMarker: keyMarker,
        VersionIdMarker: versionIdMarker,
      };

      const listResponse = await s3.listObjectVersions(listParams).promise();
      const objectsToDelete = [];

      // Add all objects (including delete markers)
      if (listResponse.Versions) {
        objectsToDelete.push(
          ...listResponse.Versions.map((v) => ({
            Key: v.Key,
            VersionId: v.VersionId,
          }))
        );
      }

      // Add all delete markers
      if (listResponse.DeleteMarkers) {
        objectsToDelete.push(
          ...listResponse.DeleteMarkers.map((d) => ({
            Key: d.Key,
            VersionId: d.VersionId,
          }))
        );
      }

      // Delete objects in batches (S3 API limit is 1000 per request)
      if (objectsToDelete.length > 0) {
        const deleteParams = {
          Bucket: bucketName,
          Delete: {
            Objects: objectsToDelete,
          },
        };

        const deleteResponse = await s3.deleteObjects(deleteParams).promise();
        console.log(`Deleted ${deleteResponse.Deleted.length} objects/versions`);

        if (deleteResponse.Errors && deleteResponse.Errors.length > 0) {
          console.warn('Errors during deletion:');
          deleteResponse.Errors.forEach((error) => {
            console.warn(`  - ${error.Key}: ${error.Code} - ${error.Message}`);
          });
        }
      }

      // Check if there are more results
      isTruncated = listResponse.IsTruncated;
      keyMarker = listResponse.NextKeyMarker;
      versionIdMarker = listResponse.NextVersionIdMarker;
    }

    console.log(`Successfully emptied bucket: ${bucketName}`);
    console.log('Bucket is now ready to be deleted by Terraform.');
  } catch (error) {
    console.error(`Error emptying bucket: ${error.message}`);
    if (error.code === 'NoSuchBucket') {
      console.log('Bucket does not exist or has already been deleted.');
    } else if (error.code === 'AccessDenied') {
      console.error('Access denied. Assuming bucket is already empty or inaccessible.');
    } else {
      process.exit(1);
    }
  }
}

emptyBucket();
