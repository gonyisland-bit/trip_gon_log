/* Web push for Tripgon (v1.3.6 6-b). Firebase shows the notification sent by api/push and opens
   its link when tapped; this worker only has to start messaging. Keep the version in step with
   the firebase package. */
importScripts('https://www.gstatic.com/firebasejs/12.14.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/12.14.0/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: 'AIzaSyCVoOjtWJKRb-dzGYs3FySFllKTaAfktxo',
  authDomain: 'trip-gon-log.firebaseapp.com',
  projectId: 'trip-gon-log',
  storageBucket: 'trip-gon-log.firebasestorage.app',
  messagingSenderId: '836705572435',
  appId: '1:836705572435:web:209d36cff3f290ef5118a6',
});

firebase.messaging();
