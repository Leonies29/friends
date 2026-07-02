# Firebase Storage — photo de profil

L’upload depuis GitHub Pages (`https://leonies29.github.io`) échoue tant que **CORS** et **Storage Rules** ne sont pas configurés sur le bucket Firebase.

## 1. Règles de sécurité Storage

Dans [Firebase Console → Storage → Rules](https://console.firebase.google.com/project/istanbul-b919b/storage/rules), colle le contenu de `firebase/storage.rules`, puis **Publish**.

Ou avec Firebase CLI :

```bash
firebase deploy --only storage --project istanbul-b919b
```

## 2. CORS (obligatoire pour GitHub Pages)

Le navigateur bloque l’upload sans CORS sur le bucket Google Cloud Storage.

### Prérequis

- [Google Cloud SDK](https://cloud.google.com/sdk/docs/install) (`gsutil`)
- Connexion : `gcloud auth login`
- Projet : `gcloud config set project istanbul-b919b`

### Commande

Depuis la racine du repo :

```bash
gsutil cors set firebase/storage.cors.json gs://istanbul-b919b.firebasestorage.app
```

Vérifier :

```bash
gsutil cors get gs://istanbul-b919b.firebasestorage.app
```

Tu dois voir `https://leonies29.github.io` dans `origin`.

## 3. Tester

1. Recharge l’app sur GitHub Pages (Ctrl+F5).
2. Profile → choisir une image.
3. L’avatar doit se mettre à jour ; plus d’erreur CORS dans la console.

## Erreur Firestore « requires an index »

Si tu vois encore cette erreur ailleurs, clique le lien dans la console Firebase pour créer l’index automatiquement. Le tri des jeux admin a été corrigé côté app pour éviter un index `games` + `order`.
