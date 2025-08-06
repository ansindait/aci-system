export interface UserData {
    uid?: string;
    name: string;
    email: string;
    nik: string;
    role: string;
    division?: string;
    pic?: string;
    position?: string;
    phone?: string;
    address?: string;
    createdAt?: Date;
    updatedAt?: Date;
  }
  
  export interface FirebaseUser {
    uid: string;
    email: string | null;
    displayName: string | null;
    photoURL: string | null;
  }
