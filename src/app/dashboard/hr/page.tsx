"use client";

import { useState, useEffect } from "react";
import { MoreHorizontal, UserCog, Loader2 } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { collection, getDocs, updateDoc, doc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { User } from "@/interfaces/firebase";
import AddUserDialog from "./components/AddUserDialog";
import withAuth from "@/lib/hocs/withAuth";
import { FIREBASE_RESOURCES, USER_ROLES } from "@/enums/resources";

function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);

  useEffect(() => {
    const fetchUsers = async () => {
      setLoading(true);
      try {
        const querySnapshot = await getDocs(collection(db, "users"));
        const usersData = querySnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as User[];
        setUsers(usersData);
      } catch (error) {
        setError("Failed to fetch users. Please try again.");
      } finally {
        setLoading(false);
      }
    };

    fetchUsers();
  }, []);

  // Filter users based on search term
  const filteredUsers = users.filter(
    (user) =>
      user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.role.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Toggle user status (active/inactive)
  const toggleUserStatus = async (userId: string) => {
    setLoading(true);
    setError(null);

    try {
      const userRef = doc(db, "users", userId);
      const user = users.find((user) => user.id === userId);
      if (user) {
        await updateDoc(userRef, {
          status: user.status === "active" ? "inactive" : "active",
        });
        setUsers(
          users.map((user) =>
            user.id === userId
              ? {
                  ...user,
                  status: user.status === "active" ? "inactive" : "active",
                }
              : user
          )
        );
      }
    } catch (error) {
      setError("Failed to update user status. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Update user role
  const updateUserRole = async (userId: string, newRole: string) => {
    setLoading(true);
    setError(null);

    try {
      const userRef = doc(db, "users", userId);
      await updateDoc(userRef, { role: newRole });
      setUsers(
        users.map((user) =>
          user.id === userId ? { ...user, role: newRole } : user
        )
      );
    } catch (error) {
      setError("Failed to update user role. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Toggle user permission for a specific resource
  const togglePermission = async (
    userId: string,
    resource: string,
    permission: "view" | "edit" | "delete" | "admin"
  ) => {
    setLoading(true);
    setError(null);

    try {
      const userRef = doc(db, "users", userId);
      const user = users.find((user) => user.id === userId);
      if (user) {
        const currentPermission =
          user.permissions?.[resource]?.[permission] || false;
        await updateDoc(userRef, {
          permissions: {
            ...user.permissions,
            [resource]: {
              ...user.permissions[resource],
              [permission]: !currentPermission,
            },
          },
        });
        setUsers(
          users.map((user) =>
            user.id === userId
              ? {
                  ...user,
                  permissions: {
                    ...user.permissions,
                    [resource]: {
                      ...user.permissions[resource],
                      [permission]: !currentPermission,
                    },
                  },
                }
              : user
          )
        );
      }
    } catch (error) {
      setError("Failed to update user permissions. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Open edit dialog with selected user
  const openEditDialog = (user: any) => {
    setSelectedUser({ ...user });
    setIsEditDialogOpen(true);
  };

  // Save user changes from edit dialog
  const saveUserChanges = async () => {
    if (!selectedUser) return;

    setLoading(true);
    setError(null);

    try {
      const userRef = doc(db, "users", selectedUser.id);
      await updateDoc(userRef, selectedUser as any);
      setUsers(
        users.map((user) => (user.id === selectedUser.id ? selectedUser : user))
      );
      setIsEditDialogOpen(false);
    } catch (error) {
      setError("Failed to save user changes. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto py-10">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <div>
          <CardTitle className="text-2xl font-bold">User Management</CardTitle>
          <CardDescription>
            Manage user accounts, roles, and permissions
          </CardDescription>
        </div>
        <Button onClick={() => setIsAddDialogOpen(true)}>
          <UserCog className="mr-2 h-4 w-4" />
          Add New User
        </Button>
      </CardHeader>
      <CardContent>
        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div className="flex items-center py-4">
          <Input
            placeholder="Search users..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="max-w-sm"
          />
        </div>

        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[300px]">Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Resources</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading && filteredUsers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-24 text-center">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                    <span className="mt-2 text-sm text-muted-foreground">
                      Loading users...
                    </span>
                  </TableCell>
                </TableRow>
              ) : filteredUsers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-24 text-center">
                    No users found.
                  </TableCell>
                </TableRow>
              ) : (
                filteredUsers.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell className="font-medium">{user.email}</TableCell>
                    <TableCell>
                      <Select
                        defaultValue={user.role}
                        onValueChange={(value) =>
                          updateUserRole(user.id, value)
                        }
                      >
                        <SelectTrigger className="w-[130px]">
                          <SelectValue placeholder="Select role" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="admin">Admin</SelectItem>
                          <SelectItem value="viewer">Viewer</SelectItem>
                          <SelectItem value="custom">Custom</SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      {user.status === "active" ? (
                        <Badge className="bg-green-500 hover:bg-green-600">
                          Active
                        </Badge>
                      ) : (
                        <Badge
                          variant="outline"
                          className="text-muted-foreground"
                        >
                          Inactive
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <ul className="flex gap-1 flex-wrap">
                        {Object.keys(user.permissions || {}).map((resource) => (
                          <Button
                            variant={"default"}
                            key={resource}
                            className="capitalize px-2 rounded"
                          >
                            {resource}
                          </Button>
                        ))}
                      </ul>
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0">
                            <span className="sr-only">Open menu</span>
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>Actions</DropdownMenuLabel>
                          <DropdownMenuItem
                            onClick={() => openEditDialog(user)}
                          >
                            Edit user
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => toggleUserStatus(user.id)}
                          >
                            {user.status === "active"
                              ? "Deactivate"
                              : "Activate"}{" "}
                            user
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
      <AddUserDialog
        isOpen={isAddDialogOpen}
        onClose={() => setIsAddDialogOpen(false)}
        onSave={(newUser) => setUsers([...users, newUser])}
      />
      {/* Edit User Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[550px] max-h-[95vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit User</DialogTitle>
            <DialogDescription>
              Make changes to the user account. Click save when you're done.
            </DialogDescription>
          </DialogHeader>
          {selectedUser && (
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <label htmlFor="email" className="text-right">
                  Email
                </label>
                <Input
                  id="email"
                  value={selectedUser.email}
                  onChange={(e) =>
                    setSelectedUser({ ...selectedUser, email: e.target.value })
                  }
                  className="col-span-3"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <label htmlFor="role" className="text-right">
                  Role
                </label>
                <Select
                  value={selectedUser.role}
                  onValueChange={(value) =>
                    setSelectedUser({ ...selectedUser, role: value })
                  }
                >
                  <SelectTrigger className="col-span-3">
                    <SelectValue placeholder="Select role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">Admin</SelectItem>
                    <SelectItem value="viewer">Viewer</SelectItem>
                    <SelectItem value="custom">Custom</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <label htmlFor="status" className="text-right">
                  Status
                </label>
                <Select
                  value={selectedUser.status}
                  onValueChange={(value) =>
                    setSelectedUser({ ...selectedUser, status: value })
                  }
                >
                  <SelectTrigger className="col-span-3">
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <label className="text-right">Permissions:</label>
                {/* <div className="col-span-3 flex space-x-2">
                  <Button
                    size="sm"
                    variant={
                      selectedUser.permissions?.view ? "default" : "outline"
                    }
                    onClick={() =>
                      setSelectedUser({
                        ...selectedUser,
                        permissions: {
                          ...selectedUser.permissions,
                          view: !selectedUser.permissions?.view,
                        },
                      })
                    }
                  >
                    <Eye className="h-3 w-3 mr-1" />
                    View
                  </Button>
                  <Button
                    size="sm"
                    variant={
                      selectedUser.permissions?.edit ? "default" : "outline"
                    }
                    onClick={() =>
                      setSelectedUser({
                        ...selectedUser,
                        permissions: {
                          ...selectedUser.permissions,
                          edit: !selectedUser.permissions?.edit,
                        },
                      })
                    }
                  >
                    <Edit className="h-3 w-3 mr-1" />
                    Edit
                  </Button>
                  <Button
                    size="sm"
                    variant={
                      selectedUser.permissions?.delete ? "default" : "outline"
                    }
                    onClick={() =>
                      setSelectedUser({
                        ...selectedUser,
                        permissions: {
                          ...selectedUser.permissions,
                          delete: !selectedUser.permissions?.delete,
                        },
                      })
                    }
                  >
                    <Trash className="h-3 w-3 mr-1" />
                    Delete
                  </Button>
                  <Button
                    size="sm"
                    variant={
                      selectedUser.permissions?.admin ? "default" : "outline"
                    }
                    onClick={() =>
                      setSelectedUser({
                        ...selectedUser,
                        permissions: {
                          ...selectedUser.permissions,
                          admin: !selectedUser.permissions?.admin,
                        },
                      })
                    }
                  >
                    <Shield className="h-3 w-3 mr-1" />
                    Admin
                  </Button>
                </div> */}
              </div>

              <div className="grid grid-cols- gap-4">
                {Object.values(FIREBASE_RESOURCES).map((resource) => (
                  <div
                    key={resource}
                    className="grid grid-cols-5 items-center gap-4"
                  >
                    <div></div>
                    <label className="col-span-1 text-left text-sm capitalize">
                      {resource}
                    </label>
                    <div className="col-span-3 flex space-x-2">
                      {["view", "edit", "delete", "admin"].map(
                        (perm: string) => (
                          <Button
                            key={perm}
                            size="sm"
                            variant={
                              //@ts-ignore
                              selectedUser.permissions[resource]?.[perm]
                                ? "default"
                                : "outline"
                            }
                            onClick={() => {
                              if (perm === "admin") {
                                if (selectedUser.role !== "admin") return;
                                else {
                                  // give all permissions on that resource
                                  setSelectedUser({
                                    ...selectedUser,
                                    permissions: {
                                      ...selectedUser.permissions,
                                      [resource]: {
                                        view: true,
                                        edit: true,
                                        delete: true,
                                        admin: true,
                                      },
                                    },
                                  });
                                }
                              } else {
                                setSelectedUser({
                                  ...selectedUser,
                                  permissions: {
                                    ...selectedUser.permissions,
                                    [resource]: {
                                      ...selectedUser.permissions[resource],
                                      [perm]:
                                        //@ts-ignore
                                        !selectedUser.permissions[resource]?.[
                                          perm
                                        ],
                                    },
                                  },
                                });
                              }
                            }}
                            className="capitalize"
                          >
                            {perm}
                          </Button>
                        )
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsEditDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button onClick={saveUserChanges} disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default withAuth(UsersPage, {
  requiredRole: USER_ROLES.ADMIN,
  requiredPermissions: [FIREBASE_RESOURCES.USERS + ":view", FIREBASE_RESOURCES.USERS + ":edit"],
});
