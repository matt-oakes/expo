package abi43_0_0.expo.modules.constants

import android.content.Context

import abi43_0_0.expo.modules.core.BasePackage
import abi43_0_0.expo.modules.core.interfaces.InternalModule
import abi43_0_0.expo.modules.core.ExportedModule

class ConstantsPackage : BasePackage() {
  override fun createInternalModules(context: Context): List<InternalModule> =
    listOf(ConstantsService(context))

  override fun createExportedModules(context: Context): List<ExportedModule> =
    listOf(ConstantsModule(context))
}
