When you use uFCoder static library, you must define DL_USE_STATIC_LIB macro before including the uFCoder.h

After uFR-library version 4.4.1 an additional library [ws2_32.lib] must be included to support UDP transfer protocol
#pragma comment(lib, "ws2_32.lib")

Additionally, linkage to "ftd2xx_coff.lib" is mandatory.
