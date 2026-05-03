# Household Members Management - Implementation Guide

## Overview
This document details the complete implementation of the **Household Members Profile (Part 5)** feature, which allows users to add, edit, and delete household member records directly within the household data entry form.

---

## Database Schema

### `household_members` Table Structure
```sql
CREATE TABLE household_members (
  member_id INT AUTO_INCREMENT PRIMARY KEY,
  household_id VARCHAR(50) NOT NULL,
  member_name VARCHAR(100) NOT NULL,
  age INT,
  relationship_to_head VARCHAR(50),
  social_category VARCHAR(20),
  marital_status VARCHAR(20),
  education VARCHAR(100),
  occupation VARCHAR(100),
  monthly_income DECIMAL(10,2),
  mobile_number VARCHAR(15),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (household_id) REFERENCES household_master(household_id) ON DELETE CASCADE
);
```

### Field Specifications
| Field | Type | Required | Options |
|-------|------|----------|---------|
| member_name | VARCHAR(100) | ✅ Yes | - |
| age | INT | ✅ Yes | Numeric |
| relationship_to_head | VARCHAR(50) | ✅ Yes | Head, Spouse, Son, Daughter, Father, Mother, Brother, Sister, Grandfather, Grandmother, Grandson, Granddaughter, Son-in-law, Daughter-in-law, Other |
| social_category | VARCHAR(20) | No | SC, ST, OBC, General, Others |
| marital_status | VARCHAR(20) | No | Single, Married, Widowed, Divorced, Separated |
| education | VARCHAR(100) | No | Illiterate, Primary (1-5), Secondary (6-10), Higher Secondary (11-12), Graduate, Postgraduate, Professional/Technical, Other |
| occupation | VARCHAR(100) | No | Agriculture (own land), Daily Wage Labour, Salaried Employment, Business/Self-employed, Student, Homemaker, Unemployed, Retired, Other |
| monthly_income | DECIMAL(10,2) | No | Numeric (rupees) |
| mobile_number | VARCHAR(15) | No | Phone number |

---

## Frontend Implementation (HHFormView.vue)

### 1. State Variables
Added to the component's reactive state:

```javascript
const showMemberForm = ref(false)        // Controls add/edit form visibility
const editingMemberIndex = ref(null)     // Null = adding new, Number = editing index
const currentMember = ref({              // Currently being added/edited member
  member_name: '', 
  age: null, 
  relationship_to_head: '',
  social_category: '', 
  marital_status: '', 
  education: '',
  occupation: '', 
  monthly_income: null, 
  mobile_number: ''
})

// Added to form.value object:
form.value.members = []  // Array of household members
```

### 2. UI Components

#### Members Table (Display all members)
```html
<table class="members-table">
  <thead>
    <tr>
      <th>S.No</th>
      <th>Name</th>
      <th>Age</th>
      <th>Relationship</th>
      <th>Social Category</th>
      <th>Marital Status</th>
      <th>Education</th>
      <th>Occupation</th>
      <th>Monthly Income</th>
      <th>Mobile</th>
      <th>Action</th>
    </tr>
  </thead>
  <tbody>
    <tr v-for="(member, index) in form.members" :key="index">
      <!-- member data cells -->
      <td>
        <button @click="editMember(index)">✏️</button>
        <button @click="removeMember(index)">🗑️</button>
      </td>
    </tr>
  </tbody>
</table>
```

#### Add/Edit Member Form
```html
<div v-if="showMemberForm" class="member-form">
  <h4>{{ editingMemberIndex !== null ? 'Edit' : 'Add' }} Member</h4>
  
  <div class="form-grid form-grid-3">
    <div class="form-group">
      <label>Member Name *</label>
      <input v-model="currentMember.member_name" required />
    </div>
    
    <div class="form-group">
      <label>Age *</label>
      <input type="number" v-model.number="currentMember.age" required />
    </div>
    
    <div class="form-group">
      <label>Relationship to Head *</label>
      <select v-model="currentMember.relationship_to_head" required>
        <option value="">-- Select --</option>
        <option>Head</option>
        <option>Spouse</option>
        <option>Son</option>
        <option>Daughter</option>
        <!-- ... more options -->
      </select>
    </div>
    
    <!-- ... other fields ... -->
  </div>
  
  <div class="form-actions">
    <button @click="saveMember()" class="btn btn-primary">Save Member</button>
    <button @click="cancelMemberForm()" class="btn">Cancel</button>
  </div>
</div>
```

### 3. Functions

#### openMemberForm()
Opens a blank form to add a new member.
```javascript
function openMemberForm() {
  showMemberForm.value = true
  editingMemberIndex.value = null
  currentMember.value = {
    member_name: '', age: null, relationship_to_head: '',
    social_category: '', marital_status: '', education: '',
    occupation: '', monthly_income: null, mobile_number: ''
  }
}
```

#### editMember(index)
Loads an existing member's data into the form for editing.
```javascript
function editMember(index) {
  showMemberForm.value = true
  editingMemberIndex.value = index
  currentMember.value = { ...form.value.members[index] }
}
```

#### removeMember(index)
Deletes a member from the array with confirmation.
```javascript
function removeMember(index) {
  if (confirm('Are you sure you want to remove this member?')) {
    form.value.members.splice(index, 1)
  }
}
```

#### saveMember()
Validates required fields and either adds new member or updates existing.
```javascript
function saveMember() {
  // Validate required fields
  if (!currentMember.value.member_name) {
    apiError.value = 'Member name is required'
    return
  }
  if (!currentMember.value.age) {
    apiError.value = 'Member age is required'
    return
  }
  if (!currentMember.value.relationship_to_head) {
    apiError.value = 'Relationship to head is required'
    return
  }

  apiError.value = ''

  if (editingMemberIndex.value !== null) {
    // Update existing member
    form.value.members[editingMemberIndex.value] = { ...currentMember.value }
  } else {
    // Add new member
    form.value.members.push({ ...currentMember.value })
  }

  cancelMemberForm()
}
```

#### cancelMemberForm()
Closes the form and resets state.
```javascript
function cancelMemberForm() {
  showMemberForm.value = false
  editingMemberIndex.value = null
  currentMember.value = {
    member_name: '', age: null, relationship_to_head: '',
    social_category: '', marital_status: '', education: '',
    occupation: '', monthly_income: null, mobile_number: ''
  }
}
```

### 4. CSS Styles
```css
/* Member Table Styles */
.members-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
  background: white;
  border: 1px solid var(--grey-200);
  border-radius: 6px;
  overflow: hidden;
}

.members-table th {
  background: var(--grey-100);
  padding: 10px 8px;
  text-align: left;
  font-weight: 600;
  border-bottom: 2px solid var(--grey-300);
}

.members-table td {
  padding: 10px 8px;
  border-bottom: 1px solid var(--grey-200);
}

.btn-icon {
  background: none;
  border: none;
  cursor: pointer;
  font-size: 16px;
  padding: 4px 6px;
  transition: transform 0.2s;
}

.member-form {
  background: var(--grey-50);
  padding: 16px;
  border-radius: 6px;
  margin-bottom: 20px;
  border: 1px solid var(--grey-200);
}
```

---

## Backend API Implementation (households.js)

### 1. POST /households - Create with Members

**Request Body**:
```json
{
  "household_id": "TN-V01-HH0001",
  "village_id": 1,
  "head_name": "John Doe",
  // ... other household fields ...
  "members": [
    {
      "member_name": "John Doe",
      "age": 45,
      "relationship_to_head": "Head",
      "social_category": "OBC",
      "marital_status": "Married",
      "education": "Graduate",
      "occupation": "Agriculture (own land)",
      "monthly_income": 15000,
      "mobile_number": "9876543210"
    },
    {
      "member_name": "Jane Doe",
      "age": 42,
      "relationship_to_head": "Spouse",
      // ... other fields ...
    }
  ]
}
```

**Implementation**:
```javascript
router.post('/', auth, async (req, res) => {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    
    const d = req.body;
    
    // Insert household master
    await conn.query(`INSERT INTO household_master (...) VALUES (...)`, [...]);
    
    // Insert household members if provided
    if (d.members && Array.isArray(d.members) && d.members.length > 0) {
      for (const member of d.members) {
        await conn.query(
          `INSERT INTO household_members 
           (household_id, member_name, age, relationship_to_head, social_category, 
            marital_status, education, occupation, monthly_income, mobile_number)
           VALUES (?,?,?,?,?,?,?,?,?,?)`,
          [d.household_id, member.member_name, member.age || null, 
           member.relationship_to_head || null, member.social_category || null,
           member.marital_status || null, member.education || null, 
           member.occupation || null, member.monthly_income || null, 
           member.mobile_number || null]
        );
      }
    }
    
    // Audit log
    await conn.query(
      'INSERT INTO audit_log (...) VALUES (...)',
      [req.user.id, req.user.name, req.user.role, 'Household', 'CREATE', 
       d.household_id, `New household added: ${d.head_name}${d.members?.length ? ` with ${d.members.length} members` : ''}`]
    );
    
    await conn.commit();
    conn.release();
    
    res.status(201).json({ household_id: d.household_id });
  } catch (err) {
    if (conn) {
      await conn.rollback();
      conn.release();
    }
    res.status(500).json({ message: err.message });
  }
});
```

### 2. PUT /households/:id - Update with Members

**Strategy**: Delete all existing members and insert fresh set

```javascript
router.put('/:id', auth, async (req, res) => {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    
    const d = req.body;
    
    // Update household master
    await conn.query(`UPDATE household_master SET ... WHERE household_id=?`, [...]);
    
    // Update members - delete and re-insert
    if (d.members !== undefined) {
      // Delete existing members
      await conn.query('DELETE FROM household_members WHERE household_id = ?', [req.params.id]);
      
      // Insert new members if provided
      if (Array.isArray(d.members) && d.members.length > 0) {
        for (const member of d.members) {
          await conn.query(
            `INSERT INTO household_members (...) VALUES (...)`,
            [req.params.id, member.member_name, ...]
          );
        }
      }
    }
    
    await conn.query('INSERT INTO audit_log (...) VALUES (...)', [...]);
    await conn.commit();
    conn.release();
    
    res.json({ success: true });
  } catch (err) {
    if (conn) {
      await conn.rollback();
      conn.release();
    }
    res.status(500).json({ message: err.message });
  }
});
```

### 3. GET /households/:id - Fetch with Members

**Response**:
```json
{
  "household_id": "TN-V01-HH0001",
  "village_id": 1,
  "head_name": "John Doe",
  // ... other household fields ...
  "members": [
    {
      "member_id": 1,
      "member_name": "John Doe",
      "age": 45,
      "relationship_to_head": "Head",
      // ... other member fields ...
    },
    {
      "member_id": 2,
      "member_name": "Jane Doe",
      "age": 42,
      "relationship_to_head": "Spouse",
      // ... other member fields ...
    }
  ]
}
```

**Implementation**:
```javascript
router.get('/:id', auth, async (req, res) => {
  try {
    // Fetch household
    const [rows] = await pool.query(
      `SELECT h.*, v.village_name, b.block_name, d.district_name, s.state_name
       FROM household_master h
       JOIN village_master v ON h.village_id = v.village_id
       JOIN block_master b ON v.block_id = b.block_id
       JOIN district_master d ON b.district_id = d.district_id
       JOIN state_master s ON d.state_id = s.id
       WHERE h.household_id = ?`, 
      [req.params.id]
    );
    
    if (!rows.length) return res.status(404).json({ message: 'Household not found' });
    
    // Fetch household members
    const [members] = await pool.query(
      `SELECT member_id, member_name, age, relationship_to_head, social_category,
              marital_status, education, occupation, monthly_income, mobile_number
       FROM household_members WHERE household_id = ? ORDER BY member_id`,
      [req.params.id]
    );
    
    const household = rows[0];
    household.members = members;
    
    res.json(household);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});
```

### 4. DELETE /households/:id - Cascade Delete Members

```javascript
router.delete('/:id', auth, roles('admin'), async (req, res) => {
  const hh_id = req.params.id;
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    // Check if household exists
    const [existing] = await conn.query(
      'SELECT household_id, head_name FROM household_master WHERE household_id = ?',
      [hh_id]
    );
    if (!existing.length) {
      await conn.rollback();
      conn.release();
      return res.status(404).json({ message: `Household ${hh_id} not found` });
    }

    // Delete project links
    const [linkDel] = await conn.query(
      'DELETE FROM project_household_link WHERE household_id = ?', [hh_id]
    );

    // Delete household members (NEW - added)
    await conn.query(
      'DELETE FROM household_members WHERE household_id = ?', [hh_id]
    );

    // Delete household master
    await conn.query(
      'DELETE FROM household_master WHERE household_id = ?', [hh_id]
    );

    await conn.query('INSERT INTO audit_log (...) VALUES (...)', [...]);
    await conn.commit();
    conn.release();

    res.json({ success: true, message: `Household ${hh_id} deleted` });
  } catch (err) {
    if (conn) {
      await conn.rollback();
      conn.release();
    }
    res.status(500).json({ message: err.message });
  }
});
```

---

## Data Flow Summary

### Creating a Household with Members:
1. User fills household form (all 10 parts)
2. User clicks "Add Member" button
3. Member form appears, user fills required fields (name, age, relationship)
4. User clicks "Save Member" → member added to `form.members` array
5. Repeat steps 2-4 for each member
6. User clicks "Submit Household" button
7. Frontend sends POST request with household data + members array
8. Backend starts transaction
9. Backend inserts household_master record
10. Backend loops through members array and inserts each to household_members table
11. Backend commits transaction
12. Success response sent to frontend

### Editing Members:
1. User opens existing household (GET request loads household + members)
2. Frontend displays members table with all member data
3. User clicks ✏️ edit button on a member row
4. Member form opens with existing data pre-filled
5. User modifies fields and clicks "Save Member"
6. Member data updated in `form.members` array
7. When household is saved (PUT request), all members are deleted and re-inserted

### Deleting Members:
1. User clicks 🗑️ delete button on member row
2. Confirmation dialog appears
3. On confirm, member is removed from `form.members` array
4. When household is saved, updated members array is persisted

---

## Testing Checklist

### Frontend Testing:
- [ ] Add member button opens form
- [ ] Required field validation works (name, age, relationship)
- [ ] Member saves to table after clicking "Save Member"
- [ ] Edit button loads member data correctly
- [ ] Delete button removes member with confirmation
- [ ] Cancel button closes form without saving
- [ ] Multiple members can be added
- [ ] Members display in table with all fields
- [ ] Form submission includes members array

### Backend Testing:
- [ ] POST creates household with members in database
- [ ] GET returns household with members array
- [ ] PUT updates household and replaces members
- [ ] DELETE removes household and cascades to members
- [ ] Transaction rollback works on error
- [ ] Audit log records member count

### Database Testing:
```sql
-- Verify member was inserted
SELECT * FROM household_members WHERE household_id = 'TN-V01-HH0001';

-- Verify cascade delete works
DELETE FROM household_master WHERE household_id = 'TN-V01-HH0001';
SELECT * FROM household_members WHERE household_id = 'TN-V01-HH0001'; -- Should return 0 rows
```

---

## Files Modified

1. **Frontend**:
   - `frontend/src/views/HHFormView.vue` - Added member UI and functions

2. **Backend**:
   - `backend/routes/households.js` - Updated all CRUD endpoints

3. **Database**:
   - `backend/db/migration_household_questionnaire.sql` - Created household_members table
   - `backend/db/seed_household_test_data.sql` - Added test member data

---

## Next Steps (Optional Enhancements)

1. **Member Validation**:
   - Add age range validation (0-120)
   - Phone number format validation
   - Duplicate member name warning

2. **Member Features**:
   - Member photo upload
   - Aadhaar number field
   - Health status indicators
   - Employment details expansion

3. **UI Improvements**:
   - Pagination for large member lists
   - Search/filter members
   - Bulk import from CSV
   - Print member list

4. **Reporting**:
   - Member demographics summary
   - Age distribution charts
   - Occupation breakdown
   - Income analysis

---

## Summary

The household members management feature is now **fully functional**. Users can:
- ✅ Add multiple members to a household
- ✅ Edit existing member details
- ✅ Delete members
- ✅ View all members in a table
- ✅ Save members with household data
- ✅ Load members when editing household

All operations are **transactional** and **database-backed**, ensuring data consistency and integrity.
