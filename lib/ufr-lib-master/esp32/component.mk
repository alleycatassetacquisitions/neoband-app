COMPONENT_ADD_INCLUDEDIRS := include
CFLAGS := -Wno-pragmas -Wno-unused-variable -Wno-maybe-uninitialized -Wno-implicit-function-declaration -mlongcalls -DDEBUG_PRINT=0 -D_NO_FTDI=1

COMPONENT_ADD_LDFLAGS += $(COMPONENT_PATH)/lib/libufcoder.a