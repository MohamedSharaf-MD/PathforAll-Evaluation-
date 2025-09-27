# CloudFront Setup for PathforAll WSI Slides

## Overview
This guide helps you configure CloudFront to serve your WSI slides efficiently with proper caching and CORS settings.

## Prerequisites
- AWS S3 bucket `wsi-path` with your DZ files
- AWS CloudFront distribution
- Proper IAM permissions

## CloudFront Configuration

### 1. Origin Settings
- **Origin Domain**: `wsi-path.s3.us-east-2.amazonaws.com`
- **Origin Path**: (leave empty)
- **Origin Access Control**: Create new OAC (recommended over OAI)

### 2. Cache Behaviors
Create separate cache behaviors for different file types:

#### DZI Files
- **Path Pattern**: `*/slide.dzi`
- **Cache Policy**: Custom
  - TTL: 1 year (31536000 seconds)
  - Headers: Include `Origin`
  - Query Strings: None
- **Origin Request Policy**: Custom
  - Headers: Include `Origin`
  - Query Strings: None

#### Tile Images (JPG)
- **Path Pattern**: `*/slide_files/*`
- **Cache Policy**: Custom
  - TTL: 1 year (31536000 seconds)
  - Headers: Include `Origin`
  - Query Strings: None
- **Origin Request Policy**: Custom
  - Headers: Include `Origin`
  - Query Strings: None

#### XML Files
- **Path Pattern**: `*.xml`
- **Cache Policy**: Custom
  - TTL: 1 year (31536000 seconds)
  - Headers: Include `Origin`
  - Query Strings: None

### 3. CORS Configuration
Add CORS headers in CloudFront response headers policy:

```json
{
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, HEAD, OPTIONS",
  "Access-Control-Allow-Headers": "Origin, X-Requested-With, Content-Type, Accept",
  "Access-Control-Max-Age": "86400"
}
```

### 4. S3 Bucket Policy
Update your S3 bucket policy to allow CloudFront access:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "AllowCloudFrontServicePrincipal",
      "Effect": "Allow",
      "Principal": {
        "Service": "cloudfront.amazonaws.com"
      },
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::wsi-path/*",
      "Condition": {
        "StringEquals": {
          "AWS:SourceArn": "arn:aws:cloudfront::YOUR_ACCOUNT_ID:distribution/YOUR_DISTRIBUTION_ID"
        }
      }
    }
  ]
}
```

## Testing CloudFront URLs

After setup, test your CloudFront distribution:

1. **DZI File**: `https://YOUR_CLOUDFRONT_DOMAIN/case_0NTDJG/slide.dzi`
2. **Tile Image**: `https://YOUR_CLOUDFRONT_DOMAIN/case_0NTDJG/slide_files/0/0_0.jpg`
3. **Properties**: `https://YOUR_CLOUDFRONT_DOMAIN/case_0NTDJG/slide_files/vips-properties.xml`

## Performance Optimization

### 1. Compression
Enable compression for XML and text files in CloudFront.

### 2. HTTP/2
Ensure HTTP/2 is enabled for better performance.

### 3. Regional Edge Caches
Use regional edge caches for global distribution.

## Security Considerations

### 1. Origin Access Control (OAC)
- Use OAC instead of OAI for better security
- Restrict S3 access to CloudFront only

### 2. HTTPS Only
- Redirect HTTP to HTTPS
- Use TLS 1.2+ only

### 3. Geographic Restrictions
- Consider geographic restrictions if needed
- Use AWS WAF for additional protection

## Monitoring

### 1. CloudWatch Metrics
Monitor key metrics:
- Cache hit ratio
- Origin requests
- Error rates
- Data transfer

### 2. Real User Monitoring (RUM)
Enable RUM to track actual user experience.

## Troubleshooting

### Common Issues

1. **CORS Errors**
   - Check CloudFront response headers policy
   - Verify S3 CORS configuration

2. **404 Errors**
   - Verify S3 bucket policy
   - Check CloudFront origin settings

3. **Slow Loading**
   - Check cache hit ratio
   - Verify compression settings
   - Monitor origin response times

### Debug Commands

```bash
# Test DZI file
curl -I https://YOUR_CLOUDFRONT_DOMAIN/case_0NTDJG/slide.dzi

# Test tile image
curl -I https://YOUR_CLOUDFRONT_DOMAIN/case_0NTDJG/slide_files/0/0_0.jpg

# Check CORS headers
curl -H "Origin: https://yourdomain.com" -I https://YOUR_CLOUDFRONT_DOMAIN/case_0NTDJG/slide.dzi
```

## Cost Optimization

### 1. Cache Hit Ratio
- Aim for >90% cache hit ratio
- Monitor and adjust TTL settings

### 2. Data Transfer
- Use CloudFront for all slide access
- Avoid direct S3 access

### 3. Regional Pricing
- Consider using regional edge caches
- Monitor data transfer costs

## Next Steps

1. Update the `CLOUDFRONT_DOMAIN` variable in both scripts
2. Run the upload script: `./upload_slides_to_s3.sh`
3. Run the database registration: `node scripts/register_slides_in_db.js`
4. Test slide loading in your application
5. Monitor CloudFront metrics and optimize as needed
