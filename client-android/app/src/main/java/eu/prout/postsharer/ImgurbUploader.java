package eu.prout.postsharer;

import android.net.Uri;
import android.util.Log;

import org.json.JSONException;
import org.json.JSONObject;

import java.io.File;
import java.io.IOException;
import java.util.Arrays;

import okhttp3.ConnectionSpec;
import okhttp3.MediaType;
import okhttp3.MultipartBody;
import okhttp3.OkHttpClient;
import okhttp3.Request;
import okhttp3.RequestBody;
import okhttp3.Response;

public class ImgurbUploader {

    private static final String TAG = "ImgurbUploader";
    private final OkHttpClient http_client;

    private String secret;
    private String remote_url;


    public ImgurbUploader(String secret, String remote_url) {
        this.secret = secret;
        this.remote_url = remote_url;
        this.http_client = new OkHttpClient.Builder()
                .connectionSpecs(Arrays.asList(ConnectionSpec.MODERN_TLS, ConnectionSpec.COMPATIBLE_TLS))
                .build();
    }

    public ImgurbUploaderResult testConnection() throws IOException {
        RequestBody requestBody = new MultipartBody.Builder()
                .setType(MultipartBody.FORM)
                .addFormDataPart("secret", this.secret)
                .build();
        Request request = new Request.Builder()
                .url(this.remote_url)
                .post(requestBody)
                .build();

        Log.d(TAG, "Testing secret on " + this.remote_url);
        try {
            Response response = http_client.newCall(request).execute();
            if (!response.isSuccessful()) {
                switch (response.code()) {
                    case 403:
                        return new ImgurbUploaderResult(
                                ImgurbUploaderResult.Status.STATUS_ERROR_BAD_SECRET,
                                "Got code 403, might be bad secret");
                    case 404:
                        return new ImgurbUploaderResult(
                                ImgurbUploaderResult.Status.STATUS_ERROR_BAD_URL,
                                "Got code 404, might be bad URL");
                    default:
                        Log.d(TAG, response.toString());
                }
            }

            return new ImgurbUploaderResult(
                    ImgurbUploaderResult.Status.STATUS_OK,
                    "Got code 200, upload complete");
        } catch (java.net.UnknownHostException err) {
            return new ImgurbUploaderResult(
                    ImgurbUploaderResult.Status.STATUS_ERROR_BAD_URL, err.getLocalizedMessage() + ", might be bad URL");
        }
    }

    //public int uploadFile(byte[] data, String filename, String mimeType) throws IOException, JSONException {
    public ImgurbUploaderResult uploadFile(String path, String mimeType) throws IOException, JSONException {
        JSONObject postData = new JSONObject();
        postData.put(secret, this.secret);

        String filename = Uri.parse(path).getLastPathSegment();

        File data = new File(path);

        Log.d(TAG, "About to upload file " + filename);
        RequestBody requestBody = new MultipartBody.Builder()
                .setType(MultipartBody.FORM)
                .addFormDataPart("secret", this.secret)
                .addFormDataPart("file", filename,
                        RequestBody.create(MediaType.parse(mimeType),
                                data))
                .build();

        Request request = new Request.Builder()
                .url(this.remote_url)
                .post(requestBody)
                .build();
        try {
            Response response = http_client.newCall(request).execute();
            if (!response.isSuccessful()) {
                switch (response.code()) {
                    case 403:
                        return new ImgurbUploaderResult(
                                ImgurbUploaderResult.Status.STATUS_ERROR_BAD_SECRET,
                                "Got code 403, might be bad secret");
                    case 404:
                        return new ImgurbUploaderResult(
                                ImgurbUploaderResult.Status.STATUS_ERROR_BAD_URL,
                                "Got code 404, might be bad URL");
                    default:
                        Log.d(TAG, response.toString());
                        return new ImgurbUploaderResult(
                                ImgurbUploaderResult.Status.STATUS_ERROR_UNKNOWN,
                                "Got code " + response.code() + ", might be bad URL");
                }
            }
            JSONObject jObject = new JSONObject(response.body().string());

            String dest_url = jObject.getString("msg");

            ImgurbUploaderResult result = new ImgurbUploaderResult(
                    ImgurbUploaderResult.Status.STATUS_OK,
                    "Got code 200, upload complete");
            result.result_url = dest_url;
            return result;
        } catch (java.net.UnknownHostException err) {
            return new ImgurbUploaderResult(
                    ImgurbUploaderResult.Status.STATUS_ERROR_BAD_URL, err.getLocalizedMessage() + ", might be bad URL");
        }
    }
}
