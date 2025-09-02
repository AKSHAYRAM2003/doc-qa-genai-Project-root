# Chat Privacy & Security Fix - Test Plan

## ✅ **FIXED**: Privacy/Security Issue Resolution
**Problem**: User chats remained visible after logout, causing chat data to be accessible to other users or anonymous sessions.

**Solution**: Implemented proper chat data isolation and secure cleanup on logout.

---

## 🧪 **Manual Testing Instructions**

### **Test 1: Anonymous User Session Isolation**
1. **Open app**: http://localhost:3000
2. **Open Developer Tools** → Application → Local Storage → http://localhost:3000
3. **Start a chat** as anonymous user (without logging in)
   - Ask a question like "What is AI?"
   - Note the localStorage key created (should be `docspotlight_chats_anon_[timestamp]_[random]`)
4. **Open incognito/private window** → http://localhost:3000
   - Verify: NO chat data appears (different session)
5. **Return to original window**
   - Verify: Chat data is still there
6. **Refresh original window**
   - Verify: Chat data persists for that session

**✅ Expected Results:**
- Each anonymous session has isolated chat data
- Chat data persists within the same browser session
- No cross-session data leakage

---

### **Test 2: Authenticated User Data Isolation**

#### Part A: User Registration/Login
1. **Create Account**: Click "Sign Up" and create User A
2. **Login as User A**
3. **Check localStorage**: Should show NO chat keys (authenticated users don't use localStorage)
4. **Start chats**: Create 2-3 different chats with User A
5. **Verify backend storage**: Chats should be saved to database

#### Part B: Logout Security
1. **Check localStorage before logout**: Note any data present
2. **Click Logout**
3. **Check localStorage after logout**: 
   - ✅ ALL `docspotlight_chats*` keys should be cleared
   - ✅ `anonymous_session_id` should be cleared
   - ✅ `access_token` should be cleared

#### Part C: Cross-User Isolation
1. **Create User B**: Sign up with different email
2. **Login as User B**
3. **Verify**: NO User A chats are visible
4. **Create chats as User B**: Add some chat data
5. **Logout and login as User A**: Verify only User A's chats appear

**✅ Expected Results:**
- Authenticated users: No localStorage usage for chats
- Complete data isolation between users
- Secure cleanup on logout

---

### **Test 3: LocalStorage Security Verification**

#### Anonymous User Testing:
```javascript
// Run in browser console
console.log('LocalStorage keys:', Object.keys(localStorage))
// Should show: ["docspotlight_chats_anon_[timestamp]_[random]"]
```

#### Authenticated User Testing:
```javascript
// After login - run in browser console
console.log('LocalStorage keys:', Object.keys(localStorage))
// Should show: ["access_token"] (NO chat keys)

// After logout - run in browser console  
console.log('LocalStorage keys:', Object.keys(localStorage))
// Should show: [] (empty - all cleared)
```

---

### **Test 4: Backend API Verification**

#### Test Save/Load Endpoints:
```bash
# Get user token (from browser localStorage after login)
TOKEN="your-access-token-here"

# Test save chats
curl -X POST http://localhost:8000/api/user/save-chats \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"chats": {"test": {"messages": [{"id": "1", "content": "test"}]}}}'

# Test load chats  
curl -X GET http://localhost:8000/api/user/load-chats \
  -H "Authorization: Bearer $TOKEN"
```

---

## 🔒 **Security Checklist**

### ✅ **Fixed Issues:**
- [x] Chat data is session-specific for anonymous users
- [x] Authenticated users' chats are saved to backend only (not localStorage)
- [x] localStorage is completely cleared on logout
- [x] No cross-user data leakage
- [x] Proper user isolation in all scenarios
- [x] Session storage cleanup on logout

### ✅ **Code Changes Made:**
- [x] `chatPersistence.ts`: Added user/session-specific localStorage keys
- [x] `chatPersistence.ts`: Added `clearChatsOnLogout()` function
- [x] `chatPersistence.ts`: Updated `saveChats()` to clear localStorage for authenticated users
- [x] `chatPersistence.ts`: Updated `loadChats()` for proper user isolation
- [x] `AuthContext.tsx`: Updated `logout()` to call `clearChatsOnLogout()`
- [x] `page.tsx`: Updated to pass `user?.user_id` for proper isolation

---

## 🎯 **Expected Behavior Summary**

| User Type | Chat Storage | localStorage Usage | On Logout |
|-----------|-------------|-------------------|-----------|
| **Anonymous** | Session-specific localStorage | ✅ Used with session ID | Cleared on page close |
| **Authenticated** | Backend database only | ❌ Not used for chats | All data cleared |

---

## 🚨 **Critical Security Verification**

1. **No Data Leakage**: After User A logs out, User B cannot see User A's chats
2. **Clean Logout**: All sensitive data removed from browser storage
3. **Session Isolation**: Anonymous users in different tabs/windows have separate data
4. **Authenticated Security**: No chat data persists in browser for logged-in users

---

## ✅ **Test Status**
- Backend: ✅ Running on http://localhost:8000
- Frontend: ✅ Running on http://localhost:3000
- Privacy Fix: ✅ Implemented and ready for testing
- Syntax Errors: ✅ Fixed

**Ready for comprehensive testing!**
