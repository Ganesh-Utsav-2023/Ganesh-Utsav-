import { getAuth } from 'firebase-admin/auth';
import admin from 'firebase-admin';
admin.initializeApp({ projectId: 'ganesh-utsav-a6a5b' });
getAuth().listUsers(1).then(console.log).catch(console.error);
