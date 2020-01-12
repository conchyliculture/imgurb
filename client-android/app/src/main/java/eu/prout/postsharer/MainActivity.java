package eu.prout.postsharer;

import android.animation.Animator;
import android.animation.AnimatorListenerAdapter;
import android.annotation.SuppressLint;
import android.annotation.TargetApi;
import android.content.Context;
import android.content.SharedPreferences;
import android.os.AsyncTask;
import android.os.Build;
import android.os.Bundle;
import android.support.v7.app.AppCompatActivity;
import android.text.TextUtils;
import android.util.Log;
import android.view.KeyEvent;
import android.view.View;
import android.view.View.OnClickListener;
import android.view.inputmethod.EditorInfo;
import android.widget.Button;
import android.widget.EditText;
import android.widget.TextView;
import android.widget.Toast;

import java.io.IOException;

public class MainActivity extends AppCompatActivity {


    private static final String TAG = "MainActivity";
    private CheckConnectionTask connectionTask = null;

    // UI references.
    private EditText urlView;
    private EditText secretView;
    private View mProgressView;
    private View mUploadCheckView;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.main_activity);

        SharedPreferences sharedPreferences = getApplicationContext().getSharedPreferences(getString(R.string.my_app_preferences), Context.MODE_PRIVATE);
        String savedUrl = sharedPreferences.getString(getString(R.string.remote_url_pref), "");
        urlView = findViewById(R.id.url_view);
        urlView.setText((savedUrl));
        urlView.setOnEditorActionListener(new TextView.OnEditorActionListener() {
            @Override
            public boolean onEditorAction(TextView textView, int i, KeyEvent keyEvent) {
                return false;
            }
        });


        String savedSecret = sharedPreferences.getString(getString(R.string.secret_pref), "");
        secretView = findViewById(R.id.secret_view);
        secretView.setOnEditorActionListener(new TextView.OnEditorActionListener() {
            @Override
            public boolean onEditorAction(TextView textView, int id, KeyEvent keyEvent) {
                if (id == EditorInfo.IME_ACTION_DONE || id == EditorInfo.IME_NULL) {
                    attemptConnection();
                    return true;
                }
                return false;
            }
        });
        secretView.setText(savedSecret);

        Button urlCheckButton = findViewById(R.id.url_check_button);
        urlCheckButton.setOnClickListener(new OnClickListener() {
            @Override
            public void onClick(View view) {
                attemptConnection();
                Log.d(TAG, "Connection attempted");
            }
        });

        mUploadCheckView = findViewById(R.id.params_form);
        mProgressView = findViewById(R.id.check_connection_progress);
    }

    private void attemptConnection() {
        if (connectionTask != null) {
            return;
        }

        // Reset errors.
        urlView.setError(null);
        secretView.setError(null);

        String remoteUrl = urlView.getText().toString();
        String secret = secretView.getText().toString();

        boolean cancel = false;
        View focusView = null;

        // Check for a valid password, if the user entered one.
        if (TextUtils.isEmpty(secret)) {
            secretView.setError(getString(R.string.error_field_required));
            focusView = secretView;
            cancel = true;
        }

        // Check for a valid email address.
        if (TextUtils.isEmpty(remoteUrl)) {
            urlView.setError(getString(R.string.error_field_required));
            focusView = urlView;
            cancel = true;
        }

        if (cancel) {
            // There was an error; don't attempt login and focus the first
            // form field with an error.
            focusView.requestFocus();
        } else {
            // Show a progress spinner, and kick off a background task to
            // perform the user login attempt.
            showProgress(true);
            connectionTask = new CheckConnectionTask(remoteUrl, secret);
            connectionTask.execute((Void) null);
        }
    }

    @TargetApi(Build.VERSION_CODES.HONEYCOMB_MR2)
    private void showProgress(final boolean show) {
        // On Honeycomb MR2 we have the ViewPropertyAnimator APIs, which allow
        // for very easy animations. If available, use these APIs to fade-in
        // the progress spinner.
        int shortAnimTime = getResources().getInteger(android.R.integer.config_shortAnimTime);

        mUploadCheckView.setVisibility(show ? View.GONE : View.VISIBLE);
        mUploadCheckView.animate().setDuration(shortAnimTime).alpha(
                show ? 0 : 1).setListener(new AnimatorListenerAdapter() {
            @Override
            public void onAnimationEnd(Animator animation) {
                mUploadCheckView.setVisibility(show ? View.GONE : View.VISIBLE);
            }
        });

        mProgressView.setVisibility(show ? View.VISIBLE : View.GONE);
        mProgressView.animate().setDuration(shortAnimTime).alpha(
                show ? 1 : 0).setListener(new AnimatorListenerAdapter() {
            @Override
            public void onAnimationEnd(Animator animation) {
                mProgressView.setVisibility(show ? View.VISIBLE : View.GONE);
            }
        });
    }

    @SuppressLint("StaticFieldLeak")
    class CheckConnectionTask extends AsyncTask<Void, Void, Boolean> {

        private ImgurbUploaderResult status = new ImgurbUploaderResult();
        private final ImgurbUploader uploadChecker;

        CheckConnectionTask(String url, String secret) {
            this.uploadChecker = new ImgurbUploader(url, secret);
        }

        @Override
        protected Boolean doInBackground(Void... params) {
            try {
                this.status = uploadChecker.testConnection();
                return status.status == ImgurbUploaderResult.Status.STATUS_OK;
            } catch (IOException | java.lang.IllegalArgumentException e) {
                e.printStackTrace();
                this.status = new ImgurbUploaderResult(e.getMessage());
            }

            return false;
        }

        void toast(ImgurbUploaderResult result) {

            Context context = getApplicationContext();
            CharSequence text = "It works!";
            int duration = Toast.LENGTH_SHORT;

            SharedPreferences sharedPref = getApplicationContext().getSharedPreferences(getString(R.string.my_app_preferences), Context.MODE_PRIVATE);
            SharedPreferences.Editor editor = sharedPref.edit();
            String newUrl = urlView.getText().toString();
            String newSecret = secretView.getText().toString();
            editor.putString(getString(R.string.remote_url_pref), newUrl);
            editor.putString(getString(R.string.secret_pref), newSecret);
            Log.d(TAG, "saved " + newUrl);
            editor.apply();

            if (this.status.status != ImgurbUploaderResult.Status.STATUS_OK) {
                duration = Toast.LENGTH_LONG;
                text = result.message;
                secretView.setError(getString(R.string.error_bad_secret));
            }
            Toast toast = Toast.makeText(context, text, duration);
            toast.show();
        }

        @Override
        protected void onPostExecute(final Boolean success) {
            connectionTask = null;
            showProgress(false);
            toast(this.status);
        }

        @Override
        protected void onCancelled() {
            connectionTask = null;
            showProgress(false);
        }
    }
}

