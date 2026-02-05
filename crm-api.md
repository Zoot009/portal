# Public Audit API Route Documentation

## Overview

The Public Audit API Route (`/api/public/audit`) provides comprehensive user activity tracking and audit trail functionality. This API returns detailed information about user actions across the entire CRM system, including client management, tag operations, maintenance activities, quality checks, and warnings.

**Primary Purpose:** Track and report all user activities for audit, analytics, and accountability purposes.

**Access Level:** Public route (no authentication required in current implementation)

---

## API Endpoint

```
GET /api/public/audit
```

**Base URL 1:** `https://kpcrm.zootcloud.com/api/public/audit`
**Base URL 2:** `https://smm-crm-rho.vercel.app/api/public/audit`
**Base URL 3:** `https://crm.zootcloud.com/api/public/audit`

---

## Query Parameters

### 1. `name` (optional)
- **Type:** String
- **Description:** Filter users by name using case-insensitive partial matching
- **Behavior:** 
  - If provided: Returns audit data only for users whose names contain this string
  - If omitted: Returns audit data for all users in the system
- **Example Values:**
  - `"John"` - matches "John Doe", "Johnny Smith", "john@example"
  - `"Smith"` - matches "John Smith", "Jane Smithson"

### 2. `startDate` (optional)
- **Type:** String (ISO 8601 date format)
- **Description:** Filter activities from this date onwards (inclusive)
- **Format:** `YYYY-MM-DD` or `YYYY-MM-DDTHH:mm:ss` or full ISO 8601
- **Behavior:** Only includes activities created/updated on or after this date
- **Example Values:**
  - `"2026-02-01"` - Start of February 1, 2026 (00:00:00)
  - `"2026-02-01T10:30:00"` - February 1, 2026 at 10:30 AM

### 3. `endDate` (optional)
- **Type:** String (ISO 8601 date format)
- **Description:** Filter activities up to this date (inclusive, end of day)
- **Format:** `YYYY-MM-DD` or `YYYY-MM-DDTHH:mm:ss` or full ISO 8601
- **Behavior:** 
  - Automatically sets time to 23:59:59.999 for the specified date
  - Only includes activities created/updated on or before this date
- **Example Values:**
  - `"2026-02-03"` - End of February 3, 2026 (23:59:59.999)
  - `"2026-02-03T15:00:00"` - February 3, 2026 at 3:00 PM

### 4. `limit` (optional)
- **Type:** Integer
- **Default:** 100
- **Description:** Maximum number of records to return
- **Usage:** Pagination control
- **Example Values:** `50`, `100`, `200`

### 5. `offset` (optional)
- **Type:** Integer
- **Default:** 0
- **Description:** Number of records to skip before returning results
- **Usage:** Pagination control (used with `limit`)
- **Example Values:** `0`, `100`, `200`

---

## Response Format

### Success Response (200 OK)

```json
{
  "totalUsers": <number>,
  "users": [
    {
      "userName": "<string>",
      "employeeId": "<string | null>",
      "summary": {
        "clientsCreated": <number>,
        "clientsUpdated": <number>,
        "tagsCreated": <number>,
        "tagsUpdated": <number>,
        "problematicClientsCreated": <number>,
        "maintenanceClientsCreated": <number>,
        "maintenanceClientsUpdated": <number>,
        "maintenanceFollowUpsCreated": <number>,
        "tagDefinitionsCreated": <number>,
        "qualityChecksPerformed": <number>,
        "warningsCreated": <number>,
        "warningsReviewed": <number>,
        "totalActivities": <number>
      }
    }
  ],
  "filters": {
    "name": "<string | null>",
    "dateRange": {
      "startDate": "<ISO 8601 timestamp | null>",
      "endDate": "<ISO 8601 timestamp | null>"
    } | null
  },
  "pagination": {
    "limit": <number>,
    "offset": <number>
  }
}
```

### Error Responses

#### 404 Not Found
```json
{
  "error": "No users found matching the name"
}
```
**When:** Name parameter is provided but no users match the search criteria

#### 500 Internal Server Error
```json
{
  "error": "Internal server error"
}
```
**When:** Database connection issues or unexpected server errors

---

## Activity Types Tracked

The API tracks the following 12 types of user activities:

### 1. **Clients Created** (`clientsCreated`)
- Tracks when a user creates a new client record
- Filtered by: `createdAt` timestamp
- Includes: Regular CRM clients

### 2. **Clients Updated** (`clientsUpdated`)
- Tracks when a user modifies an existing client record
- Filtered by: `updatedAt` timestamp
- Includes: Any updates to client information

### 3. **Tags Created** (`tagsCreated`)
- Tracks when a user adds a new tag to a client
- Filtered by: `createdAt` timestamp
- Includes: ClientTag records (tags applied to clients)

### 4. **Tags Updated** (`tagsUpdated`)
- Tracks when a user modifies an existing client tag
- Filtered by: `updatedAt` timestamp
- Includes: Status changes, completion times, etc.

### 5. **Problematic Clients Created** (`problematicClientsCreated`)
- Tracks when a user creates a problematic client record
- Filtered by: `createdAt` timestamp
- Includes: Special client cases requiring attention

### 6. **Maintenance Clients Created** (`maintenanceClientsCreated`)
- Tracks when a user creates a maintenance client record
- Filtered by: `createdAt` timestamp
- Includes: Clients in the maintenance pipeline

### 7. **Maintenance Clients Updated** (`maintenanceClientsUpdated`)
- Tracks when a user updates a maintenance client record
- Filtered by: `updatedAt` timestamp
- Includes: Status changes, pitching updates, etc.

### 8. **Maintenance Follow-ups Created** (`maintenanceFollowUpsCreated`)
- Tracks when a user adds a follow-up note to a maintenance client
- Filtered by: `createdAt` timestamp
- Includes: Follow-up text and communications

### 9. **Tag Definitions Created** (`tagDefinitionsCreated`)
- Tracks when a user creates a new tag definition (template)
- Filtered by: `createdAt` timestamp
- Includes: New tag types available system-wide

### 10. **Quality Checks Performed** (`qualityChecksPerformed`)
- Tracks when a user performs a quality check on a client
- Filtered by: `createdAt` timestamp
- Includes: Quality assessments and scores

### 11. **Warnings Created** (`warningsCreated`)
- Tracks when a user creates a warning for another user
- Filtered by: `createdAt` timestamp
- Includes: All warning types (quality, performance, deadline, etc.)

### 12. **Warnings Reviewed** (`warningsReviewed`)
- Tracks when a user reviews a warning
- Filtered by: `reviewedAt` timestamp
- Includes: Warning acknowledgments and resolutions

---

## Use Cases and Examples

### Use Case 1: Get All Users Activity Summary
**Scenario:** Retrieve audit data for all users without any filters

**Request:**
```http
GET /api/public/audit
```

**Use When:**
- Generating a complete system activity report
- Dashboard overview of all user activities
- Initial data load for analytics

**Response Characteristics:**
- Returns all users in the system
- Shows lifetime activity counts (no date filtering)
- Uses optimized `_count` queries for performance

---

### Use Case 2: Search Users by Name
**Scenario:** Find audit data for users whose name contains "John"

**Request:**
```http
GET /api/public/audit?name=John
```

**Use When:**
- Looking for a specific user's activities
- Partial name recall (don't remember full name)
- Multiple users with similar names exist

**Response Characteristics:**
- Returns only matching users
- Case-insensitive search
- Partial matching (substring search)

---

### Use Case 3: Get Activity for a Specific Date
**Scenario:** View all user activities that occurred on February 3, 2026

**Request:**
```http
GET /api/public/audit?startDate=2026-02-03&endDate=2026-02-03
```

**Use When:**
- Daily activity reports
- Investigating activities on a specific day
- End-of-day summaries

**Response Characteristics:**
- Includes activities from 00:00:00 to 23:59:59.999 on that date
- All activity counts reflect only that day
- Uses manual counting with date filters

---

### Use Case 4: Get Activity for a Date Range
**Scenario:** View all user activities for the last 7 days (Jan 27 - Feb 3, 2026)

**Request:**
```http
GET /api/public/audit?startDate=2026-01-27&endDate=2026-02-03
```

**Use When:**
- Weekly reports
- Trend analysis over time
- Performance reviews for a period

**Response Characteristics:**
- Includes all activities within the date range
- Both start and end dates are inclusive
- Useful for period-based analytics

---

### Use Case 5: Get Activity from a Date Onwards
**Scenario:** View all user activities since January 1, 2026

**Request:**
```http
GET /api/public/audit?startDate=2026-01-01
```

**Use When:**
- Year-to-date reports
- Activities after a system change or event
- Cumulative metrics from a starting point

**Response Characteristics:**
- No end date limit
- Includes all activities from start date to present
- Good for "since inception" queries

---

### Use Case 6: Get Activity Up to a Date
**Scenario:** View all user activities up to and including February 3, 2026

**Request:**
```http
GET /api/public/audit?endDate=2026-02-03
```

**Use When:**
- Historical data up to a cutoff point
- "Before event X" analysis
- Quarterly or annual cutoff reports

**Response Characteristics:**
- Includes all historical data up to the specified date
- End date is inclusive (23:59:59.999)
- No start date limit

---

### Use Case 7: Combined Name and Date Filtering
**Scenario:** View John's activities for February 2026

**Request:**
```http
GET /api/public/audit?name=John&startDate=2026-02-01&endDate=2026-02-29
```

**Use When:**
- Individual performance reviews
- User-specific period analysis
- Targeted audit investigations

**Response Characteristics:**
- Only users matching "John" are included
- Only activities within February 2026 are counted
- Most specific filtering option

---

### Use Case 8: Pagination for Large Datasets
**Scenario:** Retrieve users in batches of 50, getting the second page

**Request:**
```http
GET /api/public/audit?limit=50&offset=50
```

**Use When:**
- System has many users
- Building paginated UI
- Reducing response size for performance

**Response Characteristics:**
- Returns 50 users starting from the 51st user
- Useful for infinite scroll or page-based navigation
- Combine with other filters as needed

---

## Performance Considerations

### Optimized Path (No Date Filter)
When **no date filters** are applied, the API uses Prisma's `_count` aggregation feature:

**Characteristics:**
- ✅ Extremely fast (single query per user for all counts)
- ✅ Minimal database load
- ✅ Suitable for real-time dashboards
- ✅ Recommended for frequent polling

**Example:**
```http
GET /api/public/audit
GET /api/public/audit?name=John
```

---

### Manual Counting Path (With Date Filter)
When **date filters** are applied, the API uses individual count queries:

**Characteristics:**
- ⚠️ Slower (12 count queries per user)
- ⚠️ Higher database load
- ⚠️ May timeout with many users and tight connection pools
- ✅ Necessary for accurate date-filtered counts

**Example:**
```http
GET /api/public/audit?startDate=2026-02-01
GET /api/public/audit?name=John&startDate=2026-02-01&endDate=2026-02-03
```

**Recommendations:**
- Use date filters only when necessary
- Consider caching results for date-based queries
- For many users, filter by name first to reduce load
- Monitor database connection pool usage

---

## Data Filtering Logic

### Name Filtering
- Applied at database level using Prisma's `contains` with `mode: "insensitive"`
- Occurs **before** activity counting (reduces data processed)
- SQL equivalent: `WHERE name ILIKE '%searchTerm%'`

### Date Filtering
The date filter applies to different timestamp fields based on activity type:

| Activity Type | Filtered By Field |
|--------------|------------------|
| Clients Created | `createdAt` |
| Clients Updated | `updatedAt` |
| Tags Created | `createdAt` |
| Tags Updated | `updatedAt` |
| Problematic Clients Created | `createdAt` |
| Maintenance Clients Created | `createdAt` |
| Maintenance Clients Updated | `updatedAt` |
| Maintenance Follow-ups Created | `createdAt` |
| Tag Definitions Created | `createdAt` |
| Quality Checks Performed | `createdAt` |
| Warnings Created | `createdAt` |
| Warnings Reviewed | `reviewedAt` |

**Important Notes:**
- Start date: Time defaults to 00:00:00 if not specified
- End date: Time is explicitly set to 23:59:59.999 for inclusivity
- Date filtering is applied to each activity type independently

---

## Response Field Descriptions

### `totalUsers`
- Total count of users matching the filter criteria
- Integer value
- Useful for pagination calculations

### `users` Array
Array of user objects with their audit summaries

#### User Fields
- `userName`: User's full name (string)
- `employeeId`: User's employee identifier (string or null if not assigned)

#### `summary` Object
Contains activity counts for this user:
- All fields are integers representing counts
- `totalActivities`: Sum of all other activity counts
- Zero counts indicate no activity of that type

### `filters` Object
Shows which filters were applied to generate the response:
- `name`: The name search term used (null if not filtered)
- `dateRange`: Object with startDate and endDate (null if not filtered)
  - Dates are in ISO 8601 format
  - Reflects the actual date range applied in the database query

### `pagination` Object
- `limit`: Maximum results per response
- `offset`: Number of records skipped
- Use for implementing pagination in client applications

---

## Error Handling

### Client Errors (4xx)

**404 - No users found matching the name**
```json
{
  "error": "No users found matching the name"
}
```
**Resolution:** Check the name parameter spelling, try a shorter search term, or omit the name filter

### Server Errors (5xx)

**500 - Internal server error**
```json
{
  "error": "Internal server error"
}
```
**Common Causes:**
- Database connection pool exhausted
- Database server down or unreachable
- Prisma client not initialized
- Query timeout (especially with date filters on large datasets)

**Resolution:**
- Check server logs for detailed error messages
- Verify database connectivity
- Reduce date range or add name filter to reduce load
- Increase database connection pool size if needed

---

## Example API Calls

### Example 1: Complete Activity Report
```bash
curl "https://your-domain.com/api/public/audit"
```

### Example 2: Search for User
```bash
curl "https://your-domain.com/api/public/audit?name=Jane"
```

### Example 3: Today's Activity
```bash
curl "https://your-domain.com/api/public/audit?startDate=2026-02-03&endDate=2026-02-03"
```

### Example 4: This Month's Activity
```bash
curl "https://your-domain.com/api/public/audit?startDate=2026-02-01&endDate=2026-02-29"
```

### Example 5: Specific User, Specific Period
```bash
curl "https://your-domain.com/api/public/audit?name=John&startDate=2026-01-01&endDate=2026-01-31"
```

### Example 6: Paginated Results
```bash
# First page (0-49)
curl "https://your-domain.com/api/public/audit?limit=50&offset=0"

# Second page (50-99)
curl "https://your-domain.com/api/public/audit?limit=50&offset=50"

# Third page (100-149)
curl "https://your-domain.com/api/public/audit?limit=50&offset=100"
```

---

## Integration Tips for AI Systems

### 1. **Caching Strategy**
- Cache responses without date filters (they change infrequently)
- Cache date-filtered responses with TTL (time-to-live) of 5-60 minutes
- Invalidate cache when users perform activities

### 2. **Query Optimization**
- Always use name filter when possible to reduce dataset size
- Use date filters only when temporal analysis is required
- Request only the data you need (use limit parameter)

### 3. **Error Recovery**
- Implement retry logic with exponential backoff for 500 errors
- Fall back to broader searches if specific name yields 404
- Log all errors for debugging and monitoring

### 4. **Data Interpretation**
- `totalActivities` provides quick overview of user engagement
- Zero values indicate user hasn't performed that activity type
- Compare `clientsCreated` vs `clientsUpdated` for creation/maintenance ratio
- High `warningsCreated` or `warningsReviewed` may indicate management role

### 5. **Performance Monitoring**
- Track response times for queries with vs without date filters
- Monitor 500 error rates (indicates system stress)
- Alert on sudden changes in activity patterns

---

## Common Questions

**Q: How do I get activity for a single specific user?**  
A: Use the name parameter with the user's full or partial name: `?name=John+Doe`

**Q: What's the difference between tagsCreated and tagDefinitionsCreated?**  
A: `tagsCreated` are tags applied to clients. `tagDefinitionsCreated` are tag templates/types created for the system.

**Q: Why is the response slower with date filters?**  
A: Date filtering requires individual count queries per activity type per user, while no-date-filter uses optimized aggregation.

**Q: Can I filter by email instead of name?**  
A: Not currently. Only name filtering is supported. You can request email in the response and filter client-side.

**Q: How accurate is the date filtering?**  
A: Very accurate. Start dates include from 00:00:00, end dates include up to 23:59:59.999 of the specified day.

**Q: What if I need activities for multiple non-contiguous dates?**  
A: Make multiple API calls with different date ranges and merge results client-side.

**Q: Is there rate limiting?**  
A: Not specified in current implementation. Check your deployment configuration.

---

## Future Enhancements (Not Yet Implemented)

- Authentication and authorization
- Email-based filtering
- Role-based filtering
- Department-based filtering
- Activity type filtering (e.g., only client activities)
- Export to CSV/Excel
- Real-time updates via WebSocket
- Aggregated statistics across all users
- Time-series data for trend analysis
- Activity detail drill-down (get actual activity records, not just counts)

---

## Technical Implementation Notes

**Framework:** Next.js 14+ App Router  
**Database:** PostgreSQL via Prisma ORM  
**Response Format:** JSON  
**HTTP Methods:** GET only  
**Authentication:** None (public route)  
**CORS:** Not specified (check deployment settings)  

**Database Models Used:**
- User
- Client
- ClientTag
- TagDefinition
- ProblematicClient
- MaintenanceClient
- MaintenanceClientFollowUp
- QualityCheck
- Warnings

---

## Conclusion

The Public Audit API provides a comprehensive view of user activities across the CRM system. It supports flexible filtering by user name and date ranges, making it suitable for various reporting, analytics, and audit use cases.

For optimal performance, use the API without date filters when possible, and combine name filters with date filters to reduce the dataset size when temporal analysis is required.
