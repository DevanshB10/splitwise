import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from './components/ui/card'
import { Button } from './components/ui/button'
import { Input } from './components/ui/input'

// Types
type User = {
  id: number
  name: string
  email: string
}

type Group = {
  id: number
  name: string
  description?: string
  created_at: string
  members: User[]
}

type ExpenseSplit = {
  user_id: number
  share: number
  amount?: number
}

type Expense = {
  id: number
  description: string
  amount: number
  split_type: 'equal' | 'percentage'
  paid_by_id: number
  group_id: number
  created_at: string
  splits: ExpenseSplit[]
}

type Balance = {
  user_id: number
  amount: number
}

type Transaction = {
  from_user_id: number
  to_user_id: number
  amount: number
}

type GroupBalance = {
  balances: Balance[]
  transactions: Transaction[]
}

type SmartBalance = {
  balances: Balance[]
  transactions: Transaction[]
  smartTransactions: Transaction[]  // Optimized across groups
}

// API service
const API_URL = 'http://localhost:8000'

const defaultHeaders = {
  'Content-Type': 'application/json',
  'Accept': 'application/json',
}

const api = {
  async createUser(name: string, email: string): Promise<User> {
    const response = await fetch(`${API_URL}/users/`, {
      method: 'POST',
      headers: defaultHeaders,
      body: JSON.stringify({ name, email }),
    })
    if (!response.ok) throw new Error('Failed to create user')
    return response.json()
  },

  async getUsers(): Promise<User[]> {
    const response = await fetch(`${API_URL}/users/`, {
      headers: defaultHeaders,
    })
    if (!response.ok) throw new Error('Failed to get users')
    return response.json()
  },

  async createGroup(name: string, description: string, member_ids: number[]): Promise<Group> {
    const response = await fetch(`${API_URL}/groups/`, {
      method: 'POST',
      headers: defaultHeaders,
      body: JSON.stringify({ name, description, member_ids }),
    })
    if (!response.ok) throw new Error('Failed to create group')
    return response.json()
  },

  async getGroup(groupId: number): Promise<Group> {
    const response = await fetch(`${API_URL}/groups/${groupId}`, {
      headers: defaultHeaders,
    })
    if (!response.ok) throw new Error('Failed to get group')
    return response.json()
  },

  async createExpense(groupId: number, expense: {
    description: string
    amount: number
    split_type: 'equal' | 'percentage'
    paid_by_id: number
    splits: { user_id: number; share: number }[]
  }): Promise<Expense> {
    const response = await fetch(`${API_URL}/groups/${groupId}/expenses/`, {
      method: 'POST',
      headers: defaultHeaders,
      body: JSON.stringify(expense),
    })
    if (!response.ok) throw new Error('Failed to create expense')
    return response.json()
  },

  async getGroupExpenses(groupId: number): Promise<Expense[]> {
    const response = await fetch(`${API_URL}/groups/${groupId}/expenses/`, {
      headers: defaultHeaders,
    })
    if (!response.ok) throw new Error('Failed to get group expenses')
    return response.json()
  },

  async getGroupBalances(groupId: number): Promise<GroupBalance> {
    const response = await fetch(`${API_URL}/groups/${groupId}/balances/`, {
      headers: defaultHeaders,
    })
    if (!response.ok) throw new Error('Failed to get group balances')
    return response.json()
  },

  async getGroups(): Promise<Group[]> {
    const response = await fetch(`${API_URL}/groups/`, {
      headers: defaultHeaders,
    })
    if (!response.ok) throw new Error('Failed to get groups')
    return response.json()
  },

  async deleteUser(userId: number): Promise<void> {
    const response = await fetch(`${API_URL}/users/${userId}`, {
      method: 'DELETE',
      headers: defaultHeaders,
    })
    if (!response.ok) throw new Error('Failed to delete user')
  },

  async deleteGroup(groupId: number): Promise<void> {
    const response = await fetch(`${API_URL}/groups/${groupId}`, {
      method: 'DELETE',
      headers: defaultHeaders,
    })
    if (!response.ok) throw new Error('Failed to delete group')
  },
}

function App() {
  const [users, setUsers] = useState<User[]>([])
  const [groups, setGroups] = useState<Group[]>([])
  const [selectedGroup, setSelectedGroup] = useState<Group | null>(null)
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [groupBalances, setGroupBalances] = useState<GroupBalance | null>(null)
  const [showSmartSettlement, setShowSmartSettlement] = useState(false)
  const [smartBalances, setSmartBalances] = useState<SmartBalance | null>(null)

  // Form states
  const [newUserName, setNewUserName] = useState('')
  const [newUserEmail, setNewUserEmail] = useState('')
  const [newGroupName, setNewGroupName] = useState('')
  const [selectedMembers, setSelectedMembers] = useState<number[]>([])
  const [newExpenseDescription, setNewExpenseDescription] = useState('')
  const [newExpenseAmount, setNewExpenseAmount] = useState('')
  const [selectedPayer, setSelectedPayer] = useState<number | null>(null)
  const [splitType, setSplitType] = useState<'equal' | 'percentage'>('equal')
  const [memberShares, setMemberShares] = useState<Record<number, number>>({})

  useEffect(() => {
    loadUsers()
    loadGroups()
  }, [])

  const loadUsers = async () => {
    try {
      const fetchedUsers = await api.getUsers()
      setUsers(fetchedUsers)
    } catch (error) {
      console.error('Error loading users:', error)
    }
  }

  const loadGroups = async () => {
    try {
      const fetchedGroups = await api.getGroups()
      setGroups(fetchedGroups)
    } catch (error) {
      console.error('Error loading groups:', error)
    }
  }

  const handleCreateUser = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    try {
      await api.createUser(newUserName, newUserEmail)
      setNewUserName('')
      setNewUserEmail('')
      loadUsers()
    } catch (error) {
      console.error('Error creating user:', error)
    }
  }

  const handleCreateGroup = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (selectedMembers.length < 2) {
      alert('Need at least 2 members to create a group')
      return
    }
    try {
      const group = await api.createGroup(
        newGroupName,
        'New group',
        selectedMembers
      )
      setNewGroupName('')
      setSelectedMembers([])
      setSelectedGroup(group)
      loadGroups()
    } catch (error) {
      console.error('Error creating group:', error)
    }
  }

  const handleMemberToggle = (userId: number) => {
    setSelectedMembers(prev => 
      prev.includes(userId) 
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    )
  }

  const formatAmount = (amount: number) => {
    const dollars = Math.abs(amount / 100).toFixed(2)
    return `$${dollars}`
  }

  const getUserName = (userId: number) => {
    return users.find(u => u.id === userId)?.name || 'Unknown User'
  }

  const handleGroupSelect = async (group: Group) => {
    setSelectedGroup(group)
    try {
      // Load both expenses and balances when group is selected
      const [groupExpenses, groupBalance] = await Promise.all([
        api.getGroupExpenses(group.id),
        api.getGroupBalances(group.id)
      ])
      setExpenses(groupExpenses)
      setGroupBalances(groupBalance)
    } catch (error) {
      console.error('Error loading group data:', error)
    }
  }

  const handleCreateExpense = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!selectedGroup || !selectedPayer) return

    // Validate percentage splits sum to 100
    if (splitType === 'percentage') {
      const totalPercentage = Object.values(memberShares).reduce((sum, share) => sum + share, 0)
      if (Math.abs(totalPercentage - 100) > 0.01) {
        alert('Percentage shares must sum to 100%')
        return
      }
    }

    try {
      await api.createExpense(selectedGroup.id, {
        description: newExpenseDescription,
        amount: Math.round(parseFloat(newExpenseAmount) * 100), // Convert to cents
        split_type: splitType,
        paid_by_id: selectedPayer,
        splits: selectedGroup.members.map(member => ({
          user_id: member.id,
          share: splitType === 'equal' ? 1 : memberShares[member.id] || 0,
        })),
      })

      setNewExpenseDescription('')
      setNewExpenseAmount('')
      setSelectedPayer(null)
      setSplitType('equal')
      setMemberShares({})
      
      // Reload expenses and balances
      const [updatedExpenses, updatedBalances] = await Promise.all([
        api.getGroupExpenses(selectedGroup.id),
        api.getGroupBalances(selectedGroup.id)
      ])
      setExpenses(updatedExpenses)
      setGroupBalances(updatedBalances)
    } catch (error) {
      console.error('Error creating expense:', error)
    }
  }

  const handleShareChange = (userId: number, share: number) => {
    setMemberShares(prev => ({
      ...prev,
      [userId]: share
    }))
  }

  const handleDeleteUser = async (userId: number) => {
    if (!confirm('Are you sure you want to delete this user? This will remove them from all groups and delete their expenses.')) {
      return
    }
    try {
      await api.deleteUser(userId)
      loadUsers()
      loadGroups() // Reload groups as user list might have changed
    } catch (error) {
      console.error('Error deleting user:', error)
    }
  }

  const handleDeleteGroup = async (groupId: number) => {
    if (!confirm('Are you sure you want to delete this group? This will delete all expenses in the group.')) {
      return
    }
    try {
      await api.deleteGroup(groupId)
      if (selectedGroup?.id === groupId) {
        setSelectedGroup(null)
        setExpenses([])
        setGroupBalances(null)
      }
      loadGroups()
    } catch (error) {
      console.error('Error deleting group:', error)
    }
  }

  return (
    <main className="container mx-auto p-4">
      <h1 className="text-4xl font-bold mb-8">Splitwise Clone</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Users Section */}
        <Card>
          <CardHeader>
            <CardTitle>Users</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCreateUser} className="space-y-4 mb-4">
              <Input
                placeholder="Name"
                value={newUserName}
                onChange={(e) => setNewUserName(e.target.value)}
              />
              <Input
                placeholder="Email"
                type="email"
                value={newUserEmail}
                onChange={(e) => setNewUserEmail(e.target.value)}
              />
              <Button type="submit">Add User</Button>
            </form>
            <div className="space-y-2">
              {users.map(user => (
                <div key={user.id} className="p-2 bg-secondary rounded-md flex justify-between items-center">
                  <span>{user.name} ({user.email})</span>
                  <Button 
                    variant="destructive" 
                    size="sm"
                    onClick={() => handleDeleteUser(user.id)}
                  >
                    Delete
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Groups Section */}
        <Card>
          <CardHeader>
            <CardTitle>Groups</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCreateGroup} className="space-y-4 mb-4">
              <Input
                placeholder="Group Name"
                value={newGroupName}
                onChange={(e) => setNewGroupName(e.target.value)}
              />
              <div className="space-y-2">
                <label className="text-sm font-medium">Select Members:</label>
                <div className="max-h-40 overflow-y-auto space-y-2 border rounded-md p-2">
                  {users.map(user => (
                    <label 
                      key={user.id} 
                      className="flex items-center space-x-2 cursor-pointer p-1 hover:bg-secondary rounded"
                    >
                      <input
                        type="checkbox"
                        checked={selectedMembers.includes(user.id)}
                        onChange={() => handleMemberToggle(user.id)}
                        className="rounded border-gray-300"
                      />
                      <span>{user.name}</span>
                    </label>
                  ))}
                </div>
                {selectedMembers.length > 0 && (
                  <div className="text-sm text-muted-foreground">
                    Selected: {selectedMembers.length} members
                  </div>
                )}
              </div>
              <Button 
                type="submit" 
                disabled={selectedMembers.length < 2 || !newGroupName.trim()}
              >
                Create Group
              </Button>
            </form>
            <div className="space-y-2">
              {groups.map(group => (
                <div 
                  key={group.id} 
                  className={`p-2 rounded-md ${
                    selectedGroup?.id === group.id ? 'bg-primary text-primary-foreground' : 'bg-secondary'
                  }`}
                >
                  <div className="flex justify-between items-center mb-1">
                    <h3 className="font-semibold">{group.name}</h3>
                    <Button 
                      variant="destructive" 
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteGroup(group.id);
                      }}
                    >
                      Delete
                    </Button>
                  </div>
                  <div 
                    className="text-sm text-muted-foreground cursor-pointer"
                    onClick={() => handleGroupSelect(group)}
                  >
                    Members: {group.members.map(m => m.name).join(', ')}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Expenses Section */}
        {selectedGroup && (
          <Card>
            <CardHeader>
              <CardTitle>Add Expense</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleCreateExpense} className="space-y-4">
                <Input
                  placeholder="Description"
                  value={newExpenseDescription}
                  onChange={(e) => setNewExpenseDescription(e.target.value)}
                  required
                />
                <Input
                  placeholder="Amount"
                  type="number"
                  step="0.01"
                  value={newExpenseAmount}
                  onChange={(e) => setNewExpenseAmount(e.target.value)}
                  required
                />
                <select
                  className="w-full p-2 rounded-md border"
                  value={selectedPayer || ''}
                  onChange={(e) => setSelectedPayer(Number(e.target.value))}
                  required
                >
                  <option value="">Select who paid</option>
                  {selectedGroup.members.map(member => (
                    <option key={member.id} value={member.id}>
                      {member.name}
                    </option>
                  ))}
                </select>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Split Type:</label>
                  <select
                    className="w-full p-2 rounded-md border"
                    value={splitType}
                    onChange={(e) => setSplitType(e.target.value as 'equal' | 'percentage')}
                    required
                  >
                    <option value="equal">Equal Split</option>
                    <option value="percentage">Percentage Split</option>
                  </select>
                </div>

                {splitType === 'percentage' && (
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Percentage Shares:</label>
                    <div className="space-y-2">
                      {selectedGroup.members.map(member => (
                        <div key={member.id} className="flex items-center space-x-2">
                          <span className="w-32">{member.name}:</span>
                          <Input
                            type="number"
                            step="0.01"
                            min="0"
                            max="100"
                            value={memberShares[member.id] || ''}
                            onChange={(e) => handleShareChange(member.id, parseFloat(e.target.value) || 0)}
                            placeholder="0.00"
                            className="w-24"
                          />
                          <span>%</span>
                        </div>
                      ))}
                      <div className="text-sm text-muted-foreground">
                        Total: {Object.values(memberShares).reduce((sum, share) => sum + share, 0).toFixed(2)}%
                      </div>
                    </div>
                  </div>
                )}

                <Button 
                  type="submit"
                  disabled={
                    !newExpenseDescription.trim() || 
                    !newExpenseAmount || 
                    !selectedPayer ||
                    (splitType === 'percentage' && 
                      Math.abs(Object.values(memberShares).reduce((sum, share) => sum + share, 0) - 100) > 0.01)
                  }
                >
                  Add Expense
                </Button>
              </form>
            </CardContent>
          </Card>
        )}

        {/* Balances Section */}
        {selectedGroup && groupBalances && (
          <Card>
            <CardHeader>
              {/* <div className="flex justify-between items-center">
                <CardTitle>Group Balances</CardTitle>
                <div className="flex items-center space-x-2">
                  <label className="text-sm">Smart Settlement</label>
                  <input
                    type="checkbox"
                    checked={showSmartSettlement}
                    onChange={(e) => setShowSmartSettlement(e.target.checked)}
                    className="rounded border-gray-300"
                  />
                </div>
              </div> */}
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {/* Individual Balances */}
                <div>
                  <h3 className="font-medium mb-2">Individual Balances:</h3>
                  <div className="space-y-2">
                    {groupBalances.balances.map(balance => (
                      <div key={balance.user_id} className="flex justify-between p-2 bg-secondary rounded-md">
                        <span>{getUserName(balance.user_id)}</span>
                        <span className={balance.amount >= 0 ? 'text-green-600' : 'text-red-600'}>
                          {balance.amount >= 0 ? 'gets back ' : 'owes '}{formatAmount(Math.abs(balance.amount))}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Settlement Plan */}
                {((showSmartSettlement && smartBalances?.smartTransactions.length) || 
                  (!showSmartSettlement && groupBalances.transactions.length)) > 0 && (
                  <div>
                    <h3 className="font-medium mb-2">
                      {showSmartSettlement ? 'Smart Settlement (Across All Groups):' : 'To settle up (Within Group):'}
                    </h3>
                    <div className="space-y-2">
                      {(showSmartSettlement ? smartBalances?.smartTransactions : groupBalances.transactions).map((transaction, index) => (
                        <div key={index} className="p-2 bg-secondary rounded-md">
                          <span className="text-red-600 font-medium">{getUserName(transaction.from_user_id)}</span>
                          {' pays '}
                          <span className="text-green-600 font-medium">{getUserName(transaction.to_user_id)}</span>
                          {' '}
                          <span className="font-medium">{formatAmount(transaction.amount)}</span>
                        </div>
                      ))}
                    </div>
                    {showSmartSettlement && (
                      <div className="mt-2 text-sm text-muted-foreground">
                        Note: This is an optimized settlement plan across all groups. Only use if all members know each other.
                      </div>
                    )}
                  </div>
                )}

                {/* Expenses List */}
                <div>
                  <h3 className="font-medium mb-2">Recent Expenses:</h3>
                  <div className="space-y-2">
                    {expenses.map(expense => (
                      <div key={expense.id} className="p-2 bg-secondary rounded-md">
                        <div className="flex justify-between mb-1">
                          <span className="font-medium">{expense.description}</span>
                          <span>{formatAmount(expense.amount)}</span>
                        </div>
                        <div className="text-sm text-muted-foreground">
                          Paid by {getUserName(expense.paid_by_id)}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </main>
  )
}

export default App
