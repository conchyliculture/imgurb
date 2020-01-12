package eu.prout.postsharer;

import android.Manifest;
import android.animation.Animator;
import android.animation.AnimatorListenerAdapter;
import android.annotation.SuppressLint;
import android.annotation.TargetApi;
import android.content.ClipData;
import android.content.ClipboardManager;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.content.pm.PackageManager;
import android.database.Cursor;
import android.net.Uri;
import android.os.AsyncTask;
import android.os.Build;
import android.os.Bundle;
import android.provider.MediaStore;
import android.support.v4.app.ActivityCompat;
import android.support.v7.app.AppCompatActivity;
import android.util.Log;
import android.view.View;
import android.widget.Toast;

import org.json.JSONException;

import java.io.IOException;


public class ShareActivity extends AppCompatActivity implements ActivityCompat.OnRequestPermissionsResultCallback {
    private static final String TAG = "ShareActivity";
    private static final int MY_APP_REQUEST_CODE_LOL = 2;
    private UploadTask uploadTask;
    private View mProgressView;
    private Intent intent;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.shared_activity);

        mProgressView = findViewById(R.id.upload_progress);

        this.intent = getIntent();

        if (ActivityCompat.checkSelfPermission(this, Manifest.permission.READ_EXTERNAL_STORAGE)
                == PackageManager.PERMISSION_GRANTED) {
            handleIntent();
        } else {
            socadance();
        }
    }

    private void socadance() {
        ActivityCompat.requestPermissions(this,
                new String[]{Manifest.permission.READ_EXTERNAL_STORAGE},
                MY_APP_REQUEST_CODE_LOL);
    }

    private void handleIntent() {
        String action = this.intent.getAction();
        String type = this.intent.getType();
        if (Intent.ACTION_SEND.equals(action) && type != null) {
            if (type.startsWith("image/")) {
                handleSendImage(intent); // Handle single image being sent
            } else {
                Log.e(TAG, "No idea what to do with file of type " + type);
            }
        } else {
            Log.e(TAG, "Unknown share action " + action);
        }
    }

    private void handleSendImage(Intent intent) {
        if (uploadTask != null) {
            return;
        }
        Uri imageUri = intent.getParcelableExtra(Intent.EXTRA_STREAM);

        String mimeType = getContentResolver().getType(imageUri);

        showProgress(true);
        uploadTask = new UploadTask(imageUri, mimeType);
        uploadTask.execute((Void) null);
    }


    @TargetApi(Build.VERSION_CODES.HONEYCOMB_MR2)
    private void showProgress(final boolean show) {
        int shortAnimTime = getResources().getInteger(android.R.integer.config_shortAnimTime);

        mProgressView.setVisibility(show ? View.VISIBLE : View.GONE);
        mProgressView.animate().setDuration(shortAnimTime).alpha(
                show ? 1 : 0).setListener(new AnimatorListenerAdapter() {
            @Override
            public void onAnimationEnd(Animator animation) {
                mProgressView.setVisibility(show ? View.VISIBLE : View.GONE);
            }
        });
    }

    @Override
    public void onRequestPermissionsResult(int requestCode,
                                           String[] permissions, int[] grantResults) {
        if (requestCode == MY_APP_REQUEST_CODE_LOL) {// If request is cancelled, the result arrays are empty.
            if (grantResults.length > 0 && grantResults[0] == PackageManager.PERMISSION_GRANTED) {
                // TODO
            }
        }
    }

    @SuppressLint("StaticFieldLeak")
    class UploadTask extends AsyncTask<Void, Void, Boolean> {

        private final Uri imageUri;
        private final String mimeType;
        private ImgurbUploaderResult imgurbResult;
        private ImgurbUploader imgurbUploader;

        UploadTask(Uri imageUri, String mimeType) {
            this.imageUri = imageUri;
            this.mimeType = mimeType;
        }

        void toast(ImgurbUploaderResult result) {
            Context context = getApplicationContext();
            int duration = Toast.LENGTH_SHORT;

            String message = "Upload complete! \n";
            message += "'" + result.result_url + "' copied to clipboard";
            if (result.status != ImgurbUploaderResult.Status.STATUS_OK) {
                duration = Toast.LENGTH_LONG;
            }
            Toast toast = Toast.makeText(context, message, duration);
            toast.show();
        }

        private String getRealPathFromURI(Uri contentURI) {
            String result;
            String[] data = {MediaStore.Images.Media.DATA};
            Cursor cursor = getApplicationContext().getContentResolver()
                    .query(contentURI, data, null, null, null);
            if (cursor == null) {
                result = contentURI.getPath();
            } else {
                cursor.moveToFirst();
                int idx = cursor.getColumnIndex(MediaStore.Images.Media.DATA);
                result = cursor.getString(idx);
                cursor.close();
            }
            return result;
        }

        @Override
        protected Boolean doInBackground(Void... params) {
            try {
                SharedPreferences sharedPreferences = getApplicationContext().getSharedPreferences(getString(R.string.my_app_preferences), Context.MODE_PRIVATE);

                String remoteUrl = sharedPreferences.getString(getString(R.string.remote_url_pref), "");
                String secret = sharedPreferences.getString(getString(R.string.secret_pref), "");
                if (imgurbUploader == null) {
                    imgurbUploader = new ImgurbUploader(remoteUrl, secret);
                }

                String path = getRealPathFromURI(imageUri);
                imgurbResult = imgurbUploader.uploadFile(path, mimeType);
                if (imgurbResult.status != ImgurbUploaderResult.Status.STATUS_OK) {
                    return false;
                }
                ClipboardManager clipboard = (ClipboardManager) getSystemService(Context.CLIPBOARD_SERVICE);
                ClipData clip = ClipData.newPlainText("simple text", imgurbResult.result_url);
                if (clipboard != null) {
                    clipboard.setPrimaryClip(clip);
                }
                return true;
            } catch (java.io.FileNotFoundException e) {
                Log.e(TAG, e.getLocalizedMessage());
                return false;
            } catch (IOException | JSONException e) {
                e.printStackTrace();
                return false;
            }
        }

        @Override
        protected void onPostExecute(final Boolean success) {
            uploadTask = null;
            showProgress(false);
            toast(this.imgurbResult);
            finish();
        }

        @Override
        protected void onCancelled() {
            uploadTask = null;
            showProgress(false);
        }
    }

}
