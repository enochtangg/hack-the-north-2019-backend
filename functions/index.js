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
    const db = admin.firestore();
    let today = new Date();
    let datefield = today.toISOString().slice(0,10)

    let poolRef = db.collection('Pools').doc(datefield);
    await poolRef.get().then(doc => {
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
    const db = admin.firestore();
    let poolRef = db.collection('Pools');
    let payload = []

    await poolRef.get().then(snapshot => {
        snapshot.forEach(doc => {
            payload.push(doc.data())
        });
        return res.send(payload);
    }).catch(err => {
        console.log('Error getting documents', err);
        return res.send(err);
    });
});

exports.donateToPool = functions.https.onRequest(async (req, res) => {
    const db = admin.firestore();

    let today = new Date();
    let datefield = today.toISOString().slice(0,10)

    const donorId = req.query.donorId;
    const amount = req.query.amount;

    let allPoolRef = db.collection('Pools');
    let donorRef = db.collection('Donors').doc(donorId);

    // Add new date if not created
    // await allPoolRef.get().then(snapshot => {
    //     let hasDate = false;
    //     snapshot.forEach(doc => {
    //         if (datefield === doc.data().date) {
    //             hasDate = true;
    //         }
    //     });
    //     if (!hasDate) {
    //         let data = {
    //             date: datefield,
    //             totalAmount: 0,
    //         };
    //         await db.collection('Pools').doc(datefield).set(data);
    //     }
    // }).catch(err => {
    //     console.log('Error getting documents', err);
    //     return res.send(err);
    // });

    let poolRef = db.collection('Pools').doc(datefield);

    // Update Pool
    await poolRef.update({ totalAmount: admin.firestore.FieldValue.increment(Number(amount)) });
    
    // Update Donar
    await donorRef.update({ currentDayDonation: admin.firestore.FieldValue.increment(Number(amount)) });
    await donorRef.update({
        pastDonations: admin.firestore.FieldValue.arrayUnion({ amount: Number(amount), date: datefield})
    });

    // Update Receiver balance
    await db.collection("Receivers").get().then(snapshot => {
        let numberOfReceivers = snapshot.size;
        snapshot.forEach(async doc => {
            let receiversRef = db.collection("Receivers").doc(doc.id);
            let dividedAmount = Number(amount) / numberOfReceivers;
            await receiversRef.update({ balance: admin.firestore.FieldValue.increment(Number(dividedAmount)) });
        });
        return res.json({result: "Success"});
    });
    return res.json({result: "An an error has occurred"});
});

exports.donateToIndividual = functions.https.onRequest(async (req, res) => {
    const db = admin.firestore();

    let today = new Date();
    let datefield = today.toISOString().slice(0,10)
    
    const donorId = req.query.donorId;
    const receiverId = req.query.receiverId;
    const amount = req.query.amount;

    let donorRef = db.collection('Donors').doc(donorId);
    await donorRef.update({ currentDayDonation: admin.firestore.FieldValue.increment(Number(amount)) });
    await donorRef.update({
        pastDonations: admin.firestore.FieldValue.arrayUnion({ amount: Number(amount), date: datefield})
    });

    let receiverRef = db.collection('Receivers').doc(receiverId);
    await receiverRef.update({ balance: admin.firestore.FieldValue.increment(Number(amount)) });

    return res.json({result: "Success"});
});

exports.getDonorInfo = functions.https.onRequest(async (req, res) => {
    const db = admin.firestore();
    const donorId = req.query.donorId;

    let donorRef = db.collection('Donors').doc(donorId);
    await donorRef.get().then(doc => {
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

exports.getReceiverInfo = functions.https.onRequest(async (req, res) => {
    const db = admin.firestore();
    const receiverId = req.query.receiverId;

    let receiverRef = db.collection('Receivers').doc(receiverId);
    await receiverRef.get().then(doc => {
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
