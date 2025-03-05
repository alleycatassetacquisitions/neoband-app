idf_component_register(INCLUDE_DIRS "include")
SET(CMAKE_C_FLAGS "${CMAKE_C_FLAGS} -Wno-pragmas -Wno-unused-variable -Wno-maybe-uninitialized -Wno-implicit-function-declaration -mlongcalls -Wno-type-limits -Wno-implicit-fallthrough -Wno-format-overflow -Wno-comment -Wno-format-truncation -Wno-array-bounds -DDEBUG_PRINT=0 -D_NO_FTDI=1 -DESP_PLATFORM=1")
target_link_libraries(${COMPONENT_LIB} INTERFACE "-L${CMAKE_CURRENT_LIST_DIR}/lib")
target_link_libraries(${COMPONENT_LIB} INTERFACE ufcoder)