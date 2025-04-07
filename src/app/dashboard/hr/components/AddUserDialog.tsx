"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { setDoc, doc } from "firebase/firestore";
import { db, auth } from "@/lib/firebase";
import { User } from "@/interfaces/firebase";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { FIREBASE_RESOURCES } from "@/enums/resources";

interface AddUserDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (user: User) => void;
}

export default function AddUserDialog({
  isOpen,
  onClose,
  onSave,
}: AddUserDialogProps) {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("viewer");
  const [status, setStatus] = useState("active");
  const [loading, setLoading] = useState(false);
  const [permissions, setPermissions] = useState(
    Object.keys(FIREBASE_RESOURCES).reduce((acc, resource) => {
      acc[resource] = { view: false, edit: false, delete: false, admin: false };
      return acc;
    }, {} as User["permissions"])
  );

  const handleSave = async () => {
    setLoading(true);
    try {
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        email,
        process.env.NEXT_PUBLIC_DEFAULT_USER_PASSWORD || ""
      );
      const user = userCredential.user;

      const newUser = {
        email,
        role,
        status,
        permissions,
      };

      await setDoc(doc(db, "users", user.uid), newUser);
      onSave({ id: user.uid, ...newUser });
      onClose();
    } catch (error) {
      console.error("Error adding user:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[550px] max-h-[95vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add New User</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <label htmlFor="email" className="text-right">
              Email
            </label>
            <Input
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="col-span-3"
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <label htmlFor="role" className="text-right">
              Role
            </label>
            <Select value={role} onValueChange={setRole}>
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
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger className="col-span-3">
                <SelectValue placeholder="Select status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {role === "custom" && (
            <div className="grid gap-4">
              {Object.keys(FIREBASE_RESOURCES).map((resource: string) => (
                <div
                  key={resource}
                  className="grid grid-cols-4 items-center gap-4"
                >
                  <label className="text-right">{resource}</label>
                  <div className="col-span-3 flex space-x-2">
                    {["view", "edit", "delete", "admin"].map((perm) => (
                      <Button
                        key={perm}
                        size="sm"
                        variant={
                          // @ts-ignore
                          permissions[resource][perm] ? "default" : "outline"
                        }
                        onClick={() =>
                          setPermissions({
                            ...permissions,
                            [resource]: {
                              ...permissions[resource],
                              // @ts-ignore
                              [perm]: !permissions[resource][perm],
                            },
                          })
                        }
                      >
                        {perm.charAt(0).toUpperCase() + perm.slice(1)}
                      </Button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={loading}>
            {loading ? "Saving..." : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
