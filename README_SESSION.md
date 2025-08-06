# Session Management System

## Overview
Sistem session management ini dirancang untuk mengelola session user dengan auto-logout setelah 2 jam tidak aktif. Sistem ini menggunakan Firebase Auth dan localStorage untuk tracking aktivitas user.

## Fitur Utama

### 1. Auto-Logout
- **Timeout**: 2 jam (7200 detik) tidak aktif
- **Warning**: 5 menit sebelum logout
- **Event Monitoring**: Mouse, keyboard, scroll, dan touch events

### 2. Session Warning
- **Modal Warning**: Muncul 5 menit sebelum logout
- **Countdown Timer**: Menampilkan sisa waktu dalam detik
- **Extend Session**: Tombol untuk memperpanjang session

### 3. Session Status
- **Header Display**: Menampilkan sisa waktu session di header
- **Real-time Update**: Update setiap detik
- **Color Coding**: Merah saat < 1 jam tersisa

## Komponen

### 1. SessionManager (`src/lib/sessionManager.ts`)
```typescript
// Singleton class untuk mengelola session
const sessionManager = new SessionManager();

// Methods
sessionManager.init()           // Initialize session
sessionManager.destroy()        // Destroy session
sessionManager.updateActivity() // Update activity timestamp
sessionManager.getSessionStatus() // Get current session status
```

### 2. useSession Hook (`src/hooks/useSession.ts`)
```typescript
// React hook untuk session management
const { updateActivity } = useSession();
```

### 3. SessionWarning (`src/components/SessionWarning.tsx`)
- Modal warning yang muncul 5 menit sebelum logout
- Countdown timer
- Tombol extend session

### 4. SessionStatus (`src/components/SessionStatus.tsx`)
- Display sisa waktu session di header
- Tombol extend session
- Real-time countdown

## Konfigurasi

### SessionConfig (`src/lib/sessionConfig.ts`)
```typescript
export const SESSION_CONFIG = {
  TIMEOUT: 2 * 60 * 60 * 1000,        // 2 hours
  WARNING_TIME: 5 * 60 * 1000,         // 5 minutes
  ACTIVITY_EVENTS: ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'],
  CHECK_INTERVAL: 60000,                // 1 minute
  COUNTDOWN_INTERVAL: 1000,             // 1 second
};
```

## Cara Kerja

### 1. Login
```typescript
// Saat user login berhasil
await signInWithEmailAndPassword(auth, email, password);
sessionManager.init(); // Initialize session
```

### 2. Activity Tracking
- Sistem memonitor aktivitas user (mouse, keyboard, scroll, touch)
- Setiap aktivitas reset timer ke 2 jam
- Timestamp disimpan di localStorage

### 3. Warning System
- 5 menit sebelum logout, modal warning muncul
- Countdown timer menampilkan sisa waktu
- User bisa extend session atau dismiss warning

### 4. Auto-Logout
- Setelah 2 jam tidak aktif, user otomatis logout
- Clear localStorage dan sessionStorage
- Redirect ke halaman login

## Implementasi

### 1. Layout Integration
```typescript
// src/app/components/ClientLayout.tsx
function MainLayout({ children }) {
  useSession(); // Initialize session management
  return <>{children}</>;
}
```

### 2. Header Integration
```typescript
// src/app/components/Header.tsx
<header>
  <SessionStatus /> {/* Display session time */}
  <button onClick={handleLogout}>Logout</button>
</header>
```

### 3. Login Integration
```typescript
// src/app/page.tsx
const handleLogin = async () => {
  await signInWithEmailAndPassword(auth, email, password);
  sessionManager.init(); // Initialize session
  router.push('/menu');
};
```

## Storage Keys

### localStorage
- `lastActivity`: Timestamp aktivitas terakhir
- `sessionStart`: Timestamp mulai session

### sessionStorage
- Cleared saat logout

## Event Monitoring

### Activity Events
- `mousedown`: Mouse click
- `mousemove`: Mouse movement
- `keypress`: Keyboard input
- `scroll`: Page scrolling
- `touchstart`: Touch events (mobile)
- `click`: Click events

## Security Features

### 1. Session Validation
- Check session validity saat page load
- Auto-logout jika session expired

### 2. Clean Logout
- Clear semua session data
- Destroy event listeners
- Redirect ke login page

### 3. Cross-Tab Support
- Session status sync antar tab
- Consistent logout across tabs

## Customization

### Mengubah Timeout
```typescript
// src/lib/sessionConfig.ts
export const SESSION_CONFIG = {
  TIMEOUT: 1 * 60 * 60 * 1000, // 1 hour
  WARNING_TIME: 2 * 60 * 1000,  // 2 minutes
};
```

### Menambah Event Monitoring
```typescript
// src/lib/sessionConfig.ts
ACTIVITY_EVENTS: [
  'mousedown', 'mousemove', 'keypress', 'scroll', 
  'touchstart', 'click', 'focus', 'blur'
],
```

## Troubleshooting

### 1. Session tidak reset
- Check localStorage permissions
- Verify event listeners attached
- Check console untuk errors

### 2. Warning tidak muncul
- Check SESSION_CONFIG.WARNING_TIME
- Verify countdown interval
- Check modal z-index

### 3. Auto-logout tidak bekerja
- Check SESSION_CONFIG.TIMEOUT
- Verify signOut function
- Check Firebase Auth state

## Testing

### Manual Testing
1. Login ke aplikasi
2. Tunggu 5 menit (atau ubah WARNING_TIME untuk testing)
3. Verify warning modal muncul
4. Test extend session button
5. Test auto-logout setelah timeout

### Automated Testing
```typescript
// Test session timeout
test('should logout after 2 hours of inactivity', () => {
  // Mock time
  jest.advanceTimersByTime(2 * 60 * 60 * 1000);
  
  // Verify logout called
  expect(signOut).toHaveBeenCalled();
});
``` 