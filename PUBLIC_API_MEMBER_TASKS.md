<!-- # Member Tasks Public API Documentation

## Endpoint
`GET /api/public/member-tasks`

## Description
A public API endpoint that returns all tasks (both service tasks and asking tasks) completed by each member. Supports flexible date filtering. -->

## Query Parameters

### Option 1: Specific Date
- `date` (YYYY-MM-DD): Returns tasks completed on a specific date
  - Example: `?date=2025-12-03`

### Option 2: Date Range
- `startDate` (YYYY-MM-DD): Start date (inclusive)
- `endDate` (YYYY-MM-DD): End date (inclusive, end of day)
  - Example: `?startDate=2025-12-01&endDate=2025-12-03`

### Option 3: Till Date
- `tillDate` (YYYY-MM-DD): All tasks completed up to and including this date
  - Example: `?tillDate=2025-12-03`

### Option 4: No Parameters
- Returns all completed tasks till current date

## Example Requests

### Get tasks for today
```
GET /api/public/member-tasks?date=2025-12-03
```

### Get tasks for a date range
```
GET /api/public/member-tasks?startDate=2025-12-01&endDate=2025-12-03
```

### Get all tasks till a specific date
```
GET /api/public/member-tasks?tillDate=2025-12-03
```

### Get all tasks till now (default)
```
GET /api/public/member-tasks
```

## Response Format

```json
{
  "success": true,
  "summary": {
    "totalMembers": 5,
    "totalServiceTasks": 42,
    "totalAskingTasks": 18,
    "totalTasks": 60,
    "dateRange": {
      "specificDate": null,
      "startDate": "2025-12-01",
      "endDate": "2025-12-03",
      "tillDate": null
    }
  },
  "data": [
    {
      "member": {
        "id": "user123",
        "displayName": "John Doe",
        "email": "john@example.com",
        "employeeId": "EMP001"
      },
      "serviceTasks": [
        {
          "id": "task123",
          "title": "Complete design mockup",
          "orderId": "order456",
          "orderNumber": "ORD-2025-001",
          "customerName": "Acme Corp",
          "serviceName": "Design Service",
          "serviceType": "SERVICE_TASK",
          "teamName": "Design Team",
          "completedAt": "2025-12-03T10:30:00Z",
          "deadline": "2025-12-03T18:00:00Z"
        }
      ],
      "askingTasks": [
        {
          "id": "asking123",
          "title": "Verify customer requirements",
          "orderId": "order456",
          "orderNumber": "ORD-2025-001",
          "customerName": "Acme Corp",
          "serviceName": "Requirements Service",
          "serviceType": "ASKING_SERVICE",
          "teamName": "Requirements Team",
          "currentStage": "VERIFIED",
          "completedAt": "2025-12-03T09:15:00Z",
          "completedBy": "user789",
          "completedByName": "Jane Smith",
          "deadline": "2025-12-03T12:00:00Z"
        }
      ],
      "totalTasks": 15
    }
  ]
}
```

## Response Fields

### Summary
- `totalMembers`: Number of unique members with completed tasks
- `totalServiceTasks`: Total number of completed service tasks
- `totalAskingTasks`: Total number of completed asking tasks
- `totalTasks`: Combined total of all completed tasks
- `dateRange`: Echo of the date filters applied

### Data Array (Sorted by totalTasks descending)
Each member object contains:

#### Member Information
- `id`: User ID
- `displayName`: Display name
- `email`: Email address
- `employeeId`: Employee ID (if set)

#### Service Tasks
Array of completed service tasks with:
- `id`: Task ID
- `title`: Task title
- `orderId`: Related order ID
- `orderNumber`: Order number (e.g., ORD-2025-001)
- `customerName`: Customer name from order
- `serviceName`: Name of the service
- `serviceType`: Type of service (SERVICE_TASK)
- `teamName`: Team name
- `completedAt`: Completion timestamp
- `deadline`: Task deadline

#### Asking Tasks
Array of completed asking tasks with:
- `id`: Asking task ID
- `title`: Task title
- `orderId`: Related order ID
- `orderNumber`: Order number
- `customerName`: Customer name from order
- `serviceName`: Name of the asking service
- `serviceType`: Type of service (ASKING_SERVICE)
- `teamName`: Team name
- `currentStage`: Current stage (ASKED, SHARED, VERIFIED, INFORMED_TEAM)
- `completedAt`: Completion timestamp
- `completedBy`: User ID who completed the task
- `completedByName`: Display name of user who completed
- `deadline`: Task deadline

#### Statistics
- `totalTasks`: Total number of tasks (service + asking) for this member

## Notes

1. **Public Access**: This endpoint does not require authentication
2. **Completed Tasks Only**: Only returns tasks with a `completedAt` date
3. **Assigned Tasks Only**: Only includes tasks that were assigned to members
4. **Sorted Results**: Members are sorted by total task count (descending)
5. **Date Filtering**: All date filters use the task's `completedAt` timestamp
6. **Time Zones**: All timestamps are in UTC (ISO 8601 format)

## Use Cases

1. **Daily Reports**: Get tasks completed today
2. **Weekly Reports**: Get tasks completed in the last 7 days
3. **Monthly Reports**: Get tasks completed in the current month
4. **Performance Tracking**: Track member productivity over time
5. **Billing/Invoicing**: Calculate work done for billing periods
6. **External Dashboards**: Integrate task data into external reporting tools
