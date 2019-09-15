const functions = require('firebase-functions');
const admin = require('firebase-admin');

// // Create and Deploy Your First Cloud Functions
// // https://firebase.google.com/docs/functions/write-firebase-functions

// The Firebase Admin SDK to access the Firebase Realtime Database.

admin.initializeApp();

exports.pingFunction = functions.https.onRequest(async (req, res) => {
    res.json({result: "Pong"});
});

exports.getCurrentPool = functions.https.onRequest(async (req, res) => {
    // Push the new message into Cloud Firestore using the Firebase Admin SDK.
    const db = admin.firestore();
    let today = new Date();
    let datefield = today.toISOString().slice(0,10)

    let poolRef = db.collection('Pools').doc(datefield);
    let getDoc = poolRef.get().then(doc => {
        if (!doc.exists) {
            return res.send({result: "Does not exists"});
        } else {
            return res.send(doc.data());
        }
    })
    .catch(err => {
        console.log('Error getting document', err);
        return res.send(err)
    });
});

exports.getAllPool = functions.https.onRequest(async (req, res) => {
    // Push the new message into Cloud Firestore using the Firebase Admin SDK.
    const db = admin.firestore();
    let poolRef = db.collection('Pools');
    let payload = []

    let allPools = poolRef.get().then(snapshot => {
        snapshot.forEach(doc => {
            payload.push(doc.data())
            console.log(doc.id, '=>', doc.data());
        });
        return res.send(payload);
    }).catch(err => {
        console.log('Error getting documents', err);
        return res.send(err);
    });
});

exports.donate = functions.https.onRequest(async (req, res) => {
    // Push the new message into Cloud Firestore using the Firebase Admin SDK.
    // Param: receiverId -> string
    //        amount     -> number
    const db = admin.firestore();

    let today = new Date();
    let datefield = today.toISOString().slice(0,10)

    const receiverId = req.query.receiverId;
    const donorId = req.query.donorId;
    const amount = req.query.amount;

    let poolRef = db.collection('Pools').doc(datefield);
    let donorRef = db.collection('Donors').doc(donorId);

    // Check if today's document exists

    // Update Pool
    await poolRef.update({ totalAmount: admin.firestore.FieldValue.increment(Number(amount)) });
    
    // Update Donar
    await donorRef.update({ currentDayDonation: admin.firestore.FieldValue.increment(Number(amount)) });
    await donorRef.update({
        pastDonations: admin.firestore.FieldValue.arrayUnion({ amount: Number(amount), date: datefield})
    });

    res.json({result: "Success"});

    // Update Receiver balance

});