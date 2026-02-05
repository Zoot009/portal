
/**
 * GET /api/public/member-tasks
 * URL1 : pmskp.zootcloud.com
 * URL2 : pms.zootcloud.com
 * 
 * Public API endpoint to fetch comprehensive audit trail of all user activities
 * aggregated by employee ID.
 * 
 * @description
 * This endpoint tracks and aggregates multiple types of user actions across the system:
 * 
 * **Tracked Activities:**
 * - Orders created (by createdById)
 * - Tasks created (by createdById)
 * - Tasks completed (by assignedTo when status is COMPLETED)
 * - Folder links added to orders (by folderLinkAddedById)
 * - Orders delivered (orders with COMPLETED status)
 * 
 * **Query Parameters:**
 * @param {string} [date] - Specific date (YYYY-MM-DD) - returns activities on that date only
 * @param {string} [startDate] - Start date (YYYY-MM-DD) - returns activities from this date onwards
 * @param {string} [endDate] - End date (YYYY-MM-DD) - returns activities up to and including this date
 * @param {string} [tillDate] - Date (YYYY-MM-DD) - returns all activities up to and including this date
 * @param {string} [userId] - Filter by specific user ID - returns only activities for this user
 * 
 * **Date Filter Logic:**
 * - If `date` is provided: Returns activities for that specific day (00:00:00 to 23:59:59)
 * - If `tillDate` is provided: Returns all activities up to end of that day
 * - If `startDate` and/or `endDate`: Returns activities within that range
 * - If no date params: Returns all activities
 * 
 * **Response Structure:**
 * ```json
 * {
 *   "success": true,
 *   "summary": {
 *     "totalUsers": number,
 *     "totalActivities": number,
 *     "breakdown": {
 *       "ordersCreated": number,
 *       "tasksCreated": number,
 *       "tasksCompleted": number,
 *       "folderLinksAdded": number,
 *       "ordersDelivered": number
 *     },
 *     "filters": { applied filter parameters }
 *   },
 *   "data": [
 *     {
 *       "user": { "employeeId": string, "displayName": string },
 *       "activities": {
 *         "teams": [...],
 *         "services": [...],
 *         "orderTypes": [...],
 *         "orders": [...],
 *         "tasks": [...],
 *         "completedTasks": [...],
 *         "folderLinksAdded": [...],
 *         "deliveredOrders": [...]
 *       },
 *       "counts": {
 *         "totalActivities": number,
 *         "ordersCreated": number,
 *         "tasksCreated": number,
 *         "tasksCompleted": number,
 *         "folderLinksAdded": number,
 *         "ordersDelivered": number
 *       }
 *     }
 *   ]
 * }
 * ```
 * 
 * @returns {Promise<NextResponse>} JSON response with user activity data sorted by total activities (descending)
 */
