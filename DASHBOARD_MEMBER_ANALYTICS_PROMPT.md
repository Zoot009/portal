<!-- # Dashboard Creation Prompt: Member Tasks Analytics Dashboard

## Overview
Create a comprehensive analytics dashboard that displays member task completion data using the public API endpoint `/api/public/member-tasks`. The dashboard should provide insights into team productivity, individual performance, and task completion trends. -->



### Page Location
/dashboard/member-analytics
put this in the sidebar bar named PMS analytics
(ADMIN ONLY)

## Feature Requirements

### 1. Date Range Filters
Implement a flexible date filtering system with:

**Preset Options:**
- Today
- Yesterday
- This Week (Monday to Sunday)
- Last Week
- This Month
- Last Month
- Last 7 Days
- Last 30 Days
- Custom Range (date picker)
- All Time (till current date)

**UI Components:**
- Radio buttons or tabs for preset options
- Date range picker for custom selection
- Clear visual indication of active filter
- Display selected date range prominently

### 2. Search & Filter Options

**Member Search:**
- Search bar to filter members by:
  - Display name
  - Email address
  - Employee ID
- Real-time search with debouncing
- Clear search button

**Task Type Filter:**
- All Tasks (default)
- Service Tasks Only
- Asking Tasks Only
- Show both counts separately

**Sorting Options:**
- Total Tasks (High to Low) - default
- Total Tasks (Low to High)
- Member Name (A-Z)
- Member Name (Z-A)
- Service Tasks Count
- Asking Tasks Count

**Additional Filters:**
- Minimum task count threshold slider
- Team filter (if team data available)
- Task status filter for asking tasks (ASKED, SHARED, VERIFIED, INFORMED_TEAM)

### 3. Dashboard Layout

#### Header Section
```
┌─────────────────────────────────────────────────────────┐
│  📊 Member Tasks Analytics Dashboard                    │
│  Selected Period: Dec 1 - Dec 3, 2025                   │
└─────────────────────────────────────────────────────────┘
```

#### Summary Cards (4 cards in a row)
```
┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐
│ 👥 Members  │ │ 📋 Total    │ │ ⚙️ Service  │ │ ❓ Asking   │
│     42      │ │  Tasks      │ │   Tasks     │ │   Tasks     │
│             │ │    856      │ │    612      │ │    244      │
└─────────────┘ └─────────────┘ └─────────────┘ └─────────────┘
```

#### Filters Row
```
┌─────────────────────────────────────────────────────────┐
│ [Today] [This Week] [Last 7 Days] [Custom Range ▼]     │
│                                                         │
│ 🔍 Search members...           [All Tasks ▼] [Sort ▼]  │
└─────────────────────────────────────────────────────────┘
```

#### Charts Section (2 columns)
```
┌───────────────────────────┐ ┌───────────────────────────┐
│ Top 10 Members by Tasks   │ │ Task Distribution         │
│ (Horizontal Bar Chart)    │ │ (Pie/Doughnut Chart)      │
│                           │ │ - Service Tasks: 71.5%    │
│ John Doe     ████████ 45  │ │ - Asking Tasks: 28.5%     │
│ Jane Smith   ██████ 38    │ │                           │
│ Bob Wilson   █████ 32     │ │                           │
│ ...                       │ │                           │
└───────────────────────────┘ └───────────────────────────┘
```

```
┌─────────────────────────────────────────────────────────┐
│ Tasks Completion Trend (if date range > 1 day)          │
│ (Line/Area Chart showing daily completion counts)       │
│                                                         │
│  50 ┤        ╭─╮                                        │
│  40 ┤      ╭─╯ ╰╮    ╭╮                                │
│  30 ┤    ╭─╯    ╰────╯╰──╮                             │
│  20 ┤  ╭─╯              ╰─╮                            │
│  10 ┤╭─╯                  ╰─╮                          │
│   0 ┴─────────────────────────                         │
│     Dec 1  Dec 2  Dec 3  ...                           │
└─────────────────────────────────────────────────────────┘
```

#### Member List Table (Expandable Rows)
```
┌─────────────────────────────────────────────────────────────────┐
│ Member Details                                                  │
├─────────────────────────────────────────────────────────────────┤
│ [▼] John Doe (john@example.com) | EMP001                       │
│     Total: 45 | Service: 32 | Asking: 13                       │
│     ┌────────────────────────────────────────────────────────┐ │
│     │ Service Tasks (32)                                     │ │
│     │ • Design mockup - ORD-001 - Completed: Dec 3, 10:30   │ │
│     │ • Review layout - ORD-002 - Completed: Dec 3, 14:15   │ │
│     │ ...                                                    │ │
│     │                                                        │ │
│     │ Asking Tasks (13)                                      │ │
│     │ • Verify requirements - ORD-001 - VERIFIED            │ │
│     │ • Customer approval - ORD-003 - INFORMED_TEAM         │ │
│     │ ...                                                    │ │
│     └────────────────────────────────────────────────────────┘ │
│                                                                 │
│ [▶] Jane Smith (jane@example.com) | EMP002                     │
│     Total: 38 | Service: 28 | Asking: 10                       │
│                                                                 │
│ [▶] Bob Wilson (bob@example.com) | EMP003                      │
│     Total: 32 | Service: 25 | Asking: 7                        │
└─────────────────────────────────────────────────────────────────┘
```

### 4. Chart Specifications

#### Chart 1: Top Performers (Horizontal Bar Chart)
- Show top 10 members by total task count
- X-axis: Task count
- Y-axis: Member names
- Color gradient from low to high
- Tooltip showing breakdown (service + asking tasks)
- Click to expand member details

#### Chart 2: Task Type Distribution (Doughnut/Pie Chart)
- Service tasks vs Asking tasks ratio
- Show percentages and absolute counts
- Color coded (blue for service, orange for asking)
- Center text showing total tasks
- Interactive segments

#### Chart 3: Completion Trend (Line/Area Chart)
- Only show if date range > 1 day
- X-axis: Dates
- Y-axis: Number of tasks completed
- Multiple lines: Total, Service, Asking
- Smooth curves
- Legend with toggle visibility
- Tooltip showing exact counts per day

#### Chart 4: Team Performance Comparison (Bar Chart - Optional)
- Compare total tasks across teams
- Grouped bars showing service vs asking
- If team data is available from API

#### Chart 5: Task Stage Distribution (Stacked Bar Chart - Asking Tasks)
- Show distribution of asking task stages
- ASKED, SHARED, VERIFIED, INFORMED_TEAM
- Color coded by stage
- Only for asking tasks

### 5. Member Detail View (Expandable Row)

When a member row is clicked/expanded:

**Display:**
- Member information card (avatar, name, email, employee ID)
- Task statistics (total, service, asking)
- Two tabbed sections or collapsible sections:

**Service Tasks List:**
- Task title
- Order number (clickable link to order)
- Customer name
- Service name
- Team name
- Completion date & time
- Deadline (with status indicator if overdue)
- Badge for on-time vs late completion

**Asking Tasks List:**
- Task title
- Order number (clickable link to order)
- Customer name
- Service name
- Team name
- Current stage (color-coded badge)
- Completion date & time
- Completed by (name)
- Deadline with status

### 6. Export & Actions

**Export Options:**
- Export to CSV (member summary)
- Export detailed report (PDF)
- Copy API URL with current filters
- Share dashboard link with filters

**Additional Actions:**
- Refresh data button
- Print-friendly view
- Full-screen mode for charts
- Download chart images

### 7. Responsive Design

**Desktop (> 1024px):**
- 4 summary cards in row
- 2 charts side by side
- Full table with all columns

**Tablet (768px - 1024px):**
- 2 summary cards per row
- Charts stacked
- Simplified table

**Mobile (< 768px):**
- 1 summary card per row
- Charts full width, scrollable
- Card-based member list instead of table
- Sticky filters at top

### 8. Performance Optimization

- Implement pagination for member list (20 items per page)
- Virtual scrolling for large datasets
- Memoize chart data calculations
- Debounce search input (300ms)
- Cache API responses using React Query
- Show loading skeletons
- Error boundaries for graceful failure

### 9. Data Display Best Practices

**Empty States:**
- Show friendly message when no data
- Suggest adjusting filters
- Display illustration

**Loading States:**
- Skeleton loaders for cards
- Shimmer effect for charts
- Progressive loading (cards → charts → table)

**Error States:**
- Retry button
- Error message
- Fallback to cached data if available

### 10. Additional Features

**Task Details Modal:**
- Click on task to view full details
- Show order information
- Timeline of task progress
- Notes and completion details

**Comparison Mode:**
- Select multiple members to compare
- Side-by-side statistics
- Comparative charts

**Notifications/Insights:**
- Show top performer badge
- Highlight members with 0 tasks (if any)
- Show average tasks per member
- Identify trends (increasing/decreasing)

**Time-based Insights:**
- Peak completion hours (if timestamp granular)
- Busiest days of week
- Month-over-month comparison

## API Integration

### Endpoint
`GET /api/public/member-tasks`

### Query Parameters to Implement
```typescript
interface FilterParams {
  date?: string;          // YYYY-MM-DD
  startDate?: string;     // YYYY-MM-DD
  endDate?: string;       // YYYY-MM-DD
  tillDate?: string;      // YYYY-MM-DD
}
```

### React Query Hook Example
```typescript
const useMemberTasks = (filters: FilterParams) => {
  return useQuery({
    queryKey: ['member-tasks', filters],
    queryFn: () => fetchMemberTasks(filters),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};
```

## Code Structure

```
app/(home)/dashboard/member-analytics/
├── page.tsx                          # Main page component
├── components/
│   ├── summary-cards.tsx             # Summary statistics cards
│   ├── date-range-filter.tsx         # Date filter component
│   ├── search-filter-bar.tsx         # Search and filters
│   ├── top-performers-chart.tsx      # Bar chart component
│   ├── task-distribution-chart.tsx   # Pie/Doughnut chart
│   ├── completion-trend-chart.tsx    # Line chart component
│   ├── member-list-table.tsx         # Main table component
│   ├── member-detail-row.tsx         # Expandable row content
│   ├── task-item.tsx                 # Individual task display
│   ├── export-menu.tsx               # Export options
│   └── empty-state.tsx               # Empty state component
├── hooks/
│   ├── use-member-tasks.ts           # API hook
│   ├── use-date-filter.ts            # Date filter logic
│   └── use-table-filters.ts          # Search/sort logic
├── lib/
│   ├── date-presets.ts               # Date range presets
│   ├── chart-utils.ts                # Chart data transformations
│   └── export-utils.ts               # Export functionality
└── types/
    └── member-tasks.ts               # TypeScript types
```

## Example Color Palette

```typescript
const colors = {
  primary: 'hsl(222.2 47.4% 11.2%)',     // Dark blue
  secondary: 'hsl(210 40% 96.1%)',       // Light blue
  serviceTasks: 'hsl(221.2 83.2% 53.3%)', // Blue
  askingTasks: 'hsl(24.6 95% 53.1%)',    // Orange
  success: 'hsl(142.1 76.2% 36.3%)',     // Green
  warning: 'hsl(47.9 95.8% 53.1%)',      // Yellow
  danger: 'hsl(0 84.2% 60.2%)',          // Red
  muted: 'hsl(210 40% 96.1%)',           // Gray
};
```

## Accessibility Requirements

- Proper ARIA labels for all interactive elements
- Keyboard navigation support
- Screen reader announcements for data updates
- High contrast mode support
- Focus indicators
- Alt text for charts (text summaries)

## Testing Considerations

- Test with empty data
- Test with single member
- Test with 100+ members
- Test with very large task counts
- Test all date range combinations
- Test search with special characters
- Test export functionality
- Test responsive breakpoints

## Success Metrics

The dashboard should:
1. Load initial data within 2 seconds
2. Respond to filter changes within 500ms
3. Handle 500+ members without performance issues
4. Display all charts without layout shift
5. Work on all modern browsers (Chrome, Firefox, Safari, Edge)

## Future Enhancements

- Real-time updates using WebSockets
- Scheduled email reports
- Dashboard customization (drag & drop widgets)
- Save custom filter presets
- Team leader vs member comparison
- Historical data comparison (YoY, MoM)
- Predictive analytics (trend forecasting)
- Integration with other system dashboards

---

## Implementation Steps

1. **Setup** (30 min)
   - Create page structure and routing
   - Set up React Query hook for API
   - Define TypeScript interfaces

2. **Core UI** (2-3 hours)
   - Implement summary cards
   - Create date filter component
   - Build search and filter bar
   - Design member list table

3. **Charts** (2-3 hours)
   - Integrate Recharts
   - Create top performers chart
   - Create task distribution chart
   - Create completion trend chart

4. **Interactivity** (2 hours)
   - Implement expandable rows
   - Add search functionality
   - Wire up all filters
   - Add sorting

5. **Polish** (2 hours)
   - Add loading states
   - Add empty states
   - Implement responsive design
   - Add animations/transitions

6. **Export & Advanced** (2 hours)
   - CSV export
   - PDF generation
   - Task detail modal
   - Comparison mode

7. **Testing & Optimization** (2 hours)
   - Test edge cases
   - Performance optimization
   - Accessibility audit
   - Cross-browser testing

**Total Estimated Time: 12-15 hours**

---

Start by creating the basic page structure with summary cards and the member list table, then progressively add filters, charts, and advanced features. Use the existing Shadcn/ui components in the project for consistency.
