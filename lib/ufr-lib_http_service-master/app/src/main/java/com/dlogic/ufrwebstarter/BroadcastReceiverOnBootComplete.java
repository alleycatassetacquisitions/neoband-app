package com.dlogic.ufrwebstarter;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;

public class BroadcastReceiverOnBootComplete extends BroadcastReceiver {

    @Override
    public void onReceive(Context context, Intent intent) {
        if (intent.getAction().equalsIgnoreCase(Intent.ACTION_BOOT_COMPLETED) || intent.getAction().equalsIgnoreCase(Intent.ACTION_PACKAGE_ADDED) || intent.getAction().equalsIgnoreCase(Intent.ACTION_PACKAGE_CHANGED) || intent.getAction().equalsIgnoreCase("com.dlogic.ufrwebstarter.START_SERVICE")) {
            Intent serviceIntent = new Intent(context, uFRWebService.class);
            context.startService(serviceIntent);
        }
    }
}