package com.dlogic.ufrwebstarter;

import android.app.Service;
import android.content.Intent;
import android.os.IBinder;
import android.util.Log;

import com.dlogic.uFCoder;
import com.sun.net.httpserver.Headers;
import com.sun.net.httpserver.HttpExchange;
import com.sun.net.httpserver.HttpHandler;
import com.sun.net.httpserver.HttpServer;

import org.json.JSONException;
import org.json.JSONObject;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.io.UnsupportedEncodingException;
import java.net.InetSocketAddress;
import java.util.concurrent.Executors;

public class uFRWebService extends Service {

    private HttpServer mHttpServer;

    static {
        System.loadLibrary("uFCoder"); //Load uFCoder library
    }

    com.dlogic.uFCoder uFCoder;

    public uFRWebService() {


    }

    @Override
    public IBinder onBind(Intent intent) {
        // TODO: Return the communication channel to the service.
        throw new UnsupportedOperationException("Not yet implemented");
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        uFCoder = new uFCoder(getApplicationContext());

        startServer(1234);

        return super.onStartCommand(intent, flags, startId);
    }

    private String StreamToString(InputStream stream) throws IOException {
        ByteArrayOutputStream result = new ByteArrayOutputStream();
        byte[] buffer = new byte[1024];
        for (int length; (length = stream.read(buffer)) != -1; ) {
            result.write(buffer, 0, length);
        }
        // StandardCharsets.UTF_8.name() > JDK 7
        try {
            return result.toString("UTF-8");
        } catch (UnsupportedEncodingException e) {
            return "";
        }
    }

    private volatile boolean resource_busy = false;

    private void startServer(int port) {
        try {

            mHttpServer = HttpServer.create(new InetSocketAddress(/*InetAddress.getByName("10.0.2.2"),*/ port), 0);

            mHttpServer.setExecutor(Executors.newCachedThreadPool());

            mHttpServer.createContext("/", new HttpHandler() {
                @Override
                public void handle(HttpExchange httpExchange) throws IOException {
                    Headers headers = httpExchange.getResponseHeaders();
                    headers.add("Content-Type", "application/json");
                    String response = null;

                    if (resource_busy == false || StreamToString(httpExchange.getRequestBody()) == "Restart") {
                        resource_busy = true;
                        try {
                            response = parseRequest(StreamToString(httpExchange.getRequestBody()));
                        } catch (JSONException e) {
                            e.printStackTrace();
                        }

                        httpExchange.sendResponseHeaders(200, response.length());
                        OutputStream os = httpExchange.getResponseBody();
                        os.write(response.getBytes());
                        os.close();
                        resource_busy = false;
                    } else {
                        JSONObject json = new JSONObject();
                        try {
                            json.put("status", "[0xFF (255)] BUSY");
                            json.put("response", "");
                        } catch (JSONException e) {
                            e.printStackTrace();
                        }
                        response = json.toString();
                        httpExchange.sendResponseHeaders(200, response.length());
                        OutputStream os = httpExchange.getResponseBody();
                        os.write(response.getBytes());
                        os.close();

                    }
                }
            });


            mHttpServer.start();

        } catch (IOException e) {
            e.printStackTrace();
        }
    }

    public static byte[] hexStringToByteArray(String s) {
        int len = s.length();
        byte[] data = new byte[len / 2];

        for (int i = 0; i < len; i += 2) {
            data[i / 2] = (byte) ((Character.digit(s.charAt(i), 16) << 4) + Character.digit(s.charAt(i + 1), 16));
        }

        return data;
    }

    final protected static char[] hexArray = {'0', '1', '2', '3', '4', '5', '6', '7', '8', '9', 'A', 'B', 'C', 'D', 'E', 'F'};

    public static String byteArrayToHexString(byte[] bytes, int len) {
        char[] hexChars = new char[len * 2];
        int v;

        for (int j = 0; j < len; j++) {
            v = bytes[j] & 0xFF;
            hexChars[j * 2] = hexArray[v >>> 4];
            hexChars[j * 2 + 1] = hexArray[v & 0x0F];
        }

        return new String(hexChars);
    }
    static boolean wait=false;
    static int status = 1;
    private String parseRequest(String request) throws JSONException {
        String[] requestParams = request.split("\\s+");
        String response = "";
        status = 1;
        wait = false;
        JSONObject json = new JSONObject();

        switch (requestParams[0]) {
            case "ReaderOpen":
                status = uFCoder.ReaderOpen();
                break;
            case "ReaderClose":
                status = uFCoder.ReaderClose();
                break;
            case "ReaderOpenEx":
                wait = true;
                status = uFCoder.ReaderOpenExCb(Integer.parseInt(requestParams[1]), requestParams[2], Integer.parseInt(requestParams[3]), requestParams[4], new uFCoder.OnReaderConnected() {
                    @Override
                    public void onConnected(int i) {
                        wait = false;
                        status = i;
                    }

                    @Override
                    public void onError(int i) {
                        wait = false;
                        status = i;
                    }
                });
                break;
            case "DL_TLS_SetClientCertificate":
                byte[] n = new byte[4];
                status = uFCoder.DL_TLS_SetClientCertificate(2, n);
                break;
            case "DL_TLS_Request":
                int[] ret_status = new int[1];
                response = uFCoder.DL_TLS_Request(ret_status, requestParams[1], requestParams[2], Integer.parseInt(requestParams[3]), requestParams[4]);
                status = ret_status[0];
                break;
            case "DL_TLS_Token":
                byte[] m = new byte[4];
                status = uFCoder.DL_TLS_SetClientCertificate(2, m);
                if (status != 0) {
                    break;
                } else {
                    int[] ret_status_1 = new int[1];
                    response = uFCoder.DL_TLS_Request(ret_status_1, requestParams[1], requestParams[2], Integer.parseInt(requestParams[3]), requestParams[4]);
                    status = ret_status_1[0];
                }
                break;
            case "APDU":
                byte[] c_apdu = hexStringToByteArray(requestParams[1]);
                byte[] r_apdu = new byte[65000];
                int[] r_apdu_len = {0};
                status = uFCoder.APDUPlainTransceive(c_apdu, c_apdu.length, r_apdu, r_apdu_len);
                response = byteArrayToHexString(r_apdu, r_apdu_len[0]);
                Log.e("APDU", "RQ: " + requestParams[1] + " RE: " + response);
                break;
            case "Restart":
                stopService(new Intent(this, uFRWebService.class));
                startService(new Intent(this, uFRWebService.class));
                status = 0;
        }

        int counter = 0;
        while (wait == true)
        {
            try {
                Thread.sleep(100);
            } catch (InterruptedException e) {
                e.printStackTrace();
            }
            counter++;
            if(counter >=30)
            {
                break;
            }
        }

        json.put("status", uFCoder.UFR_Status2String(status));
        json.put("response", response);
        return json.toString();
    }

    private void stopServer() {
        if (mHttpServer != null) {
            mHttpServer.stop(0);
        }
    }

}