package eu.prout.postsharer;

public class ImgurbUploaderResult {

    Status status;
    String message;
    String result_url;

    public enum Status {
        STATUS_OK, STATUS_ERROR_BAD_URL, STATUS_ERROR_BAD_SECRET, STATUS_ERROR_NO_INTERNET, STATUS_ERROR_DIDNT_RUN, STATUS_ERROR_UNKNOWN
    }

    public String toString() {
        return "Status: " + this.status + ", Message: '" + this.message + "'";
    }

    ImgurbUploaderResult(String message) {
        this.status = Status.STATUS_ERROR_UNKNOWN;
        this.message = message;
    }

    ImgurbUploaderResult() {
        this.status = Status.STATUS_ERROR_DIDNT_RUN;
        this.message = "We didn't run lol";
    }

    ImgurbUploaderResult(Status status, String message) {
        this.status = status;
        this.message = message;
    }

}
