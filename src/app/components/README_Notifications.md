# OPS Request Notification System

## Overview

This notification system provides real-time alerts for pending OPS requests in the sidebar navigation. It displays red notification dots with counts on the "OPS" menu item and "Approval Request" submenu item.

## Features

- **Real-time monitoring** of pending OPS requests
- **Role-based filtering** of requests based on user permissions
- **Visual indicators** with count numbers on notification dots
- **Automatic updates** when requests are added or resolved

## How It Works

### 1. Data Sources

The system monitors two main Firestore collections:

- `request_ops_rpm` - For RPM role users
- `tasks/{taskId}/request_ops` - For other roles (subcollections within tasks)

### 2. Role-Based Access

- **RPM**: Sees all requests in `request_ops_rpm` collection
- **Top Management**: Sees all pending requests across all divisions
- **PIC**: Sees requests for their assigned division only
- **QC**: Sees requests for quality-related divisions (SND, EL, DC)
- **OPS**: Sees all pending requests

### 3. Pending Request Definition

A request is considered "pending" if:

- `status_ops` field equals "pending_top"
- This matches exactly what the approval page shows in the table

### 4. Notification Display

- **OPS Menu**: Shows notification dot with count
- **Approval Request Submenu**: Shows notification dot with count
- **Collapsed Sidebar**: Shows notification dot on OPS icon
- **Count Display**: Shows actual number, max 99+ for large numbers

## Components

### usePendingOpsRequests Hook

```typescript
const { pendingCount, loading } = usePendingOpsRequests();
```

**Returns:**

- `pendingCount`: Number of pending requests
- `loading`: Boolean indicating if data is being fetched

### NotificationDot Component

```typescript
<NotificationDot count={5} size="sm" className="ml-2" />
```

**Props:**

- `count`: Number to display (0 = no dot shown)
- `size`: 'sm' | 'md' | 'lg' (default: 'md')
- `className`: Additional CSS classes

## Implementation Details

### Real-time Updates

- **All users**: Uses Firestore `onSnapshot` for real-time updates
- **Dual listeners**: One for `request_ops_rpm` collection and one for `request_ops` subcollections

### Performance Considerations

- Efficient filtering by role and division
- Automatic cleanup of listeners
- Minimal re-renders with proper state management

### Error Handling

- Graceful fallback when Firestore queries fail
- Console logging for debugging
- Default to 0 pending requests on errors

## Usage Example

```tsx
import { usePendingOpsRequests } from "@/app/hooks/usePendingOpsRequests";
import NotificationDot from "@/app/components/NotificationDot";

const MyComponent = () => {
  const { pendingCount } = usePendingOpsRequests();

  return (
    <div>
      <span>OPS</span>
      {pendingCount > 0 && <NotificationDot count={pendingCount} size="sm" />}
    </div>
  );
};
```

## Testing

Use the `NotificationTest` component to verify the system is working:

```tsx
import NotificationTest from "@/app/components/NotificationTest";

// Add to any page for testing
<NotificationTest />;
```

## Firestore Structure

```
request_ops_rpm/
  ├── document1
  ├── document2
  └── ...

tasks/
  ├── task1/
  │   └── request_ops/
  │       ├── request1 (status: "pending")
  │       └── request2 (status: "approved")
  └── task2/
      └── request_ops/
          └── request3 (status: "pending")
```
